import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { collection, query, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X } from 'lucide-react';

export default function VariablesPool() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);

  const [varNames, setVarNames] = useState<string[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [editExplanation, setEditExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  const [hoverState, setHoverState] = useState<{ label: string, x: number, y: number } | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch unique variables from models
  useEffect(() => {
    const q = query(collection(db, 'modelCards'));
    const unsub = onSnapshot(q, snap => {
      const models = snap.docs.map(d => d.data());
      const ivs = models.flatMap(m => m.iv || []);
      const dvs = models.flatMap(m => m.dv || []);
      const mediators = models.flatMap(m => m.mediator || []);
      const moderators = models.flatMap(m => m.moderator || []);
      const uniqueVars = Array.from(new Set([...ivs, ...dvs, ...mediators, ...moderators])).filter(Boolean) as string[];
      setVarNames(uniqueVars);
    }, (error) => {
      console.error('Error fetching model cards for variables:', error);
    });
    return unsub;
  }, []);

  // Tooltip timer
  useEffect(() => {
    if (hoverState?.label) {
      hoverTimerRef.current = setTimeout(() => {
        setIsTooltipVisible(true);
      }, 200);
    } else {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setIsTooltipVisible(false);
    }
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [hoverState?.label]);

  // Fetch explanations
  useEffect(() => {
    const q = query(collection(db, 'variables'));
    const unsub = onSnapshot(q, snap => {
      const exps: Record<string, string> = {};
      snap.docs.forEach(d => {
        exps[d.id] = d.data().explanation;
      });
      setExplanations(exps);
    }, (error) => {
      console.error('Error fetching variables explanations:', error);
    });
    return unsub;
  }, []);

  // Physics Engine Setup
  useEffect(() => {
    if (varNames.length === 0 || !sceneRef.current) return;

    // Clean up previous engine if it exists
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
      sceneRef.current.innerHTML = ''; // Clear canvas if any
    }

    const engine = Matter.Engine.create();
    const world = engine.world;
    engineRef.current = engine;

    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;

    // Boundaries - Make them very thick to prevent tunneling
    const wallThickness = 1000;
    const ground = Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width * 5, wallThickness, { isStatic: true });
    const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 5, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 5, { isStatic: true });
    
    // Ceiling high up
    const ceiling = Matter.Bodies.rectangle(width / 2, -2000, width * 5, wallThickness, { isStatic: true });

    Matter.Composite.add(world, [ground, leftWall, rightWall, ceiling]);

    // Create bubbles
    const radius = 60; // 120px diameter
    const bodies = varNames.map((name, i) => {
      const x = Math.random() * (width - radius * 2) + radius;
      const y = -Math.random() * 500 - radius - 100; // Drop from above, safely below ceiling
      return Matter.Bodies.circle(x, y, radius, {
        restitution: 0.6,
        friction: 0.1,
        density: 0.001,
        label: name,
        render: {
          fillStyle: getColor(name)
        }
      });
    });

    Matter.Composite.add(world, bodies);

    // Keep bubbles in bounds just in case they escape
    Matter.Events.on(engine, 'beforeUpdate', () => {
      bodies.forEach(body => {
        if (body.position.y > height + 200 || body.position.x < -200 || body.position.x > width + 200) {
          Matter.Body.setPosition(body, {
            x: width / 2 + (Math.random() - 0.5) * 100,
            y: -100
          });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
        }
      });
    });

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: 'transparent',
        pixelRatio: 1 // Force 1:1 pixel ratio to fix mouse coordinate mismatch
      }
    });

    Matter.Render.run(render);

    // Mouse control
    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });
    Matter.Composite.add(world, mouseConstraint);
    mouseConstraintRef.current = mouseConstraint;

    // Add text rendering and hover detection
    let currentHoveredLabel: string | null = null;
    let lastX = 0;
    let lastY = 0;

    Matter.Events.on(render, 'afterRender', () => {
      const context = render.context;
      context.font = '12px Inter, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#1c1917'; // stone-900

      bodies.forEach(body => {
        const { x, y } = body.position;
        const text = body.label;
        
        // Simple text wrapping (up to 3 lines)
        const words = text.split(' ');
        let line = '';
        const lines = [];
        const maxWidth = radius * 1.5;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = context.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Draw lines
        const lineHeight = 16;
        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        
        lines.forEach((l, i) => {
          context.fillText(l.trim(), x, startY + (i * lineHeight));
        });
      });

      // Hover detection
      const bodiesUnderMouse = Matter.Query.point(bodies, mouse.position);
      if (bodiesUnderMouse.length > 0) {
        render.canvas.style.cursor = 'pointer';
        const body = bodiesUnderMouse[0];
        const label = body.label;
        const x = body.position.x;
        const y = body.position.y;

        if (currentHoveredLabel !== label || Math.abs(lastX - x) > 5 || Math.abs(lastY - y) > 5) {
          currentHoveredLabel = label;
          lastX = x;
          lastY = y;
          setHoverState({ label, x, y });
        }
      } else {
        render.canvas.style.cursor = 'default';
        if (currentHoveredLabel !== null) {
          currentHoveredLabel = null;
          setHoverState(null);
        }
      }
    });

    // Click detection
    let mousedownPos = { x: 0, y: 0 };
    Matter.Events.on(mouseConstraint, 'mousedown', () => {
      mousedownPos = { x: mouse.position.x, y: mouse.position.y };
    });

    Matter.Events.on(mouseConstraint, 'mouseup', () => {
      const dx = mouse.position.x - mousedownPos.x;
      const dy = mouse.position.y - mousedownPos.y;
      // Allow a larger margin for "clicks" vs "drags"
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        const bodiesUnderMouse = Matter.Query.point(bodies, mouse.position);
        if (bodiesUnderMouse.length > 0) {
          const clickedVar = bodiesUnderMouse[0].label;
          setSelectedVar(clickedVar);
        }
      }
    });

    // Keep mouse in sync with render scale
    render.mouse = mouse;

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    runnerRef.current = runner;

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current) return;
      const newWidth = sceneRef.current.clientWidth;
      const newHeight = sceneRef.current.clientHeight;
      
      render.canvas.width = newWidth;
      render.canvas.height = newHeight;
      render.canvas.style.width = `${newWidth}px`;
      render.canvas.style.height = `${newHeight}px`;
      
      Matter.Body.setPosition(ground, { x: newWidth / 2, y: newHeight + wallThickness / 2 });
      Matter.Body.setPosition(rightWall, { x: newWidth + wallThickness / 2, y: newHeight / 2 });
      Matter.Body.setPosition(ceiling, { x: newWidth / 2, y: -2000 });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      if (engineRef.current) {
        Matter.World.clear(engineRef.current.world, false);
        Matter.Engine.clear(engineRef.current);
      }
      render.canvas.remove();
    };
  }, [varNames.join(',')]); // Re-run if variables list changes

  // Helper to generate consistent pastel colors
  const getColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 85%)`;
  };

  const handleSave = async () => {
    if (!selectedVar) return;
    setSaving(true);
    try {
      const safeId = selectedVar.replace(/\//g, '_');
      await setDoc(doc(db, 'variables', safeId), {
        explanation: editExplanation,
        name: selectedVar
      }, { merge: true });
      setSelectedVar(null);
    } catch (error) {
      console.error('Error saving explanation:', error);
      alert('Failed to save explanation.');
    } finally {
      setSaving(false);
    }
  };

  // When modal opens, populate current explanation
  useEffect(() => {
    if (selectedVar) {
      const safeId = selectedVar.replace(/\//g, '_');
      setEditExplanation(explanations[safeId] || '');
    }
  }, [selectedVar, explanations]);

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Variables Pool</h1>
        <p className="text-stone-500 mt-2">All variables extracted from the Models Pool. Drag bubbles around, or click one to edit its explanation.</p>
      </div>

      <div className="flex-1 relative bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-inner" ref={sceneRef}>
        {/* Matter.js canvas will be injected here */}
        {varNames.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400">
            No variables found. Add some models first!
          </div>
        )}

        {/* Tooltip */}
        {isTooltipVisible && hoverState && explanations[hoverState.label.replace(/\//g, '_')] && (
          <div 
            className="absolute z-10 pointer-events-none bg-stone-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl max-w-xs transition-opacity duration-200"
            style={{
              left: hoverState.x,
              top: hoverState.y - 75,
              transform: 'translate(-50%, -100%)'
            }}
          >
            {explanations[hoverState.label.replace(/\//g, '_')]}
            <div className="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-stone-900 transform -translate-x-1/2 rotate-45"></div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedVar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-stone-200 relative">
            <button 
              onClick={() => setSelectedVar(null)}
              className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-stone-900 mb-6 pr-8">Variable Details</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-500 mb-2 uppercase tracking-wider">Variable Name</label>
                <div className="px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium">
                  {selectedVar}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-500 mb-2 uppercase tracking-wider">Explanation</label>
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  placeholder="Add a detailed explanation or definition for this variable..."
                  className="w-full h-40 rounded-xl border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 p-4 border bg-white resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setSelectedVar(null)}
                className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer active:scale-95 shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Explanation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
