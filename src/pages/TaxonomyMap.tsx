import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, Settings2 } from 'lucide-react';
import * as d3 from 'd3';

interface TaxonomyNode {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  variables: string[];
  createdAt: any;
}

interface TreeNode extends TaxonomyNode {
  children: TreeNode[];
}

export default function TaxonomyMap() {
  const [nodes, setNodes] = useState<TaxonomyNode[]>([]);
  const [allVariables, setAllVariables] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Fetch variables
  useEffect(() => {
    const q = query(collection(db, 'modelCards'));
    const unsub = onSnapshot(q, snap => {
      const models = snap.docs.map(d => d.data());
      const ivs = models.flatMap(m => m.iv || []);
      const dvs = models.flatMap(m => m.dv || []);
      const mediators = models.flatMap(m => m.mediator || []);
      const moderators = models.flatMap(m => m.moderator || []);
      const uniqueVars = Array.from(new Set([...ivs, ...dvs, ...mediators, ...moderators])).filter(Boolean) as string[];
      setAllVariables(uniqueVars.sort());
    });
    return unsub;
  }, []);

  // Fetch taxonomy nodes
  useEffect(() => {
    const q = query(collection(db, 'taxonomies'));
    const unsub = onSnapshot(q, snap => {
      const fetchedNodes = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaxonomyNode));
      setNodes(fetchedNodes);
    });
    return unsub;
  }, []);

  const tree = useMemo(() => {
    const nodeMap = new Map<string, TreeNode>();
    nodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));
    
    const rootNodes: TreeNode[] = [];
    nodes.forEach(n => {
      if (n.parentId) {
        const parent = nodeMap.get(n.parentId);
        if (parent) {
          parent.children.push(nodeMap.get(n.id)!);
        }
      } else {
        rootNodes.push(nodeMap.get(n.id)!);
      }
    });
    
    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(n => sortTree(n.children));
    };
    sortTree(rootNodes);
    
    return rootNodes;
  }, [nodes]);

  const handleAddRootNode = async () => {
    const name = `New Category (Level 1)`;
    const id = doc(collection(db, 'taxonomies')).id;
    await setDoc(doc(db, 'taxonomies', id), {
      name,
      parentId: null,
      level: 1,
      variables: [],
      createdAt: serverTimestamp()
    });
  };

  const handleAddSubNode = async (parent: TreeNode) => {
    if (parent.level >= 3) return;
    const name = `New Category (Level ${parent.level + 1})`;
    const id = doc(collection(db, 'taxonomies')).id;
    await setDoc(doc(db, 'taxonomies', id), {
      name,
      parentId: parent.id,
      level: parent.level + 1,
      variables: [],
      createdAt: serverTimestamp()
    });
  };

  const handleSaveName = async () => {
    if (!selectedNode || !editName.trim()) return;
    await setDoc(doc(db, 'taxonomies', selectedNode.id), { name: editName.trim() }, { merge: true });
    setSelectedNode({ ...selectedNode, name: editName.trim() });
  };

  const handleDeleteNode = async (nodeId: string) => {
    const deleteRecursive = async (id: string) => {
      const children = nodes.filter(n => n.parentId === id);
      for (const child of children) {
        await deleteRecursive(child.id);
      }
      await deleteDoc(doc(db, 'taxonomies', id));
    };
    await deleteRecursive(nodeId);
    if (selectedNode?.id === nodeId) {
      setIsModalOpen(false);
      setSelectedNode(null);
    }
  };

  const handleToggleVariable = async (node: TreeNode, variable: string) => {
    const newVars = node.variables.includes(variable)
      ? node.variables.filter(v => v !== variable)
      : [...node.variables, variable];
    
    await setDoc(doc(db, 'taxonomies', node.id), { variables: newVars }, { merge: true });
    setSelectedNode({ ...node, variables: newVars });
  };

  const openModal = (node: TreeNode, intent?: 'delete') => {
    setSelectedNode(node);
    setEditName(node.name);
    setIsModalOpen(true);
    setIsConfirmingDelete(intent === 'delete');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Taxonomy Map</h1>
          <p className="text-stone-500 mt-2">Organize variables into a hierarchical taxonomy. Click on a category to edit.</p>
        </div>
        <button 
          onClick={handleAddRootNode}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Root Category
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden relative">
        <Treemap nodes={tree} onNodeClick={openModal} onDeleteNode={handleDeleteNode} />
      </div>

      {/* Edit Modal */}
      {isModalOpen && selectedNode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-stone-500" />
                Edit Category
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Name Edit */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button 
                    onClick={handleSaveName}
                    disabled={!editName.trim() || editName === selectedNode.name}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Subcategories */}
              {selectedNode.level < 3 && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Subcategories</label>
                  <button 
                    onClick={() => handleAddSubNode(selectedNode)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-700 text-sm font-medium rounded-md hover:bg-stone-200 transition-colors border border-stone-200"
                  >
                    <Plus className="w-4 h-4" /> Add Subcategory
                  </button>
                  <p className="text-xs text-stone-500 mt-2">
                    Current level: {selectedNode.level}. Maximum level is 3.
                  </p>
                </div>
              )}

              {/* Variables */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Variables in this Category</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedNode.variables.map(v => (
                    <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-100">
                      {v}
                      <button onClick={() => handleToggleVariable(selectedNode, v)} className="hover:text-blue-900 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedNode.variables.length === 0 && <span className="text-sm text-stone-400 italic">No variables assigned</span>}
                </div>
                
                <select 
                  className="w-full text-sm border border-stone-300 rounded-md p-2 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleToggleVariable(selectedNode, e.target.value);
                  }}
                >
                  <option value="">+ Add Variable...</option>
                  {allVariables.filter(v => !selectedNode.variables.includes(v)).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-between">
              {!isConfirmingDelete ? (
                <button 
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete Category
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 font-medium">Are you sure?</span>
                  <button 
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium transition-colors cursor-pointer"
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-3 py-1.5 bg-stone-200 text-stone-800 rounded-md hover:bg-stone-300 text-sm font-medium transition-colors cursor-pointer"
                  >
                    No
                  </button>
                </div>
              )}
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-stone-200 text-stone-800 rounded-md hover:bg-stone-300 text-sm font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Treemap Component ---

function Treemap({ nodes, onNodeClick, onDeleteNode }: { nodes: TreeNode[], onNodeClick: (node: TreeNode, intent?: 'delete') => void, onDeleteNode: (id: string) => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderTreemap = () => {
      if (!containerRef.current || nodes.length === 0) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      containerRef.current.innerHTML = '';

      // Build hierarchical data for D3
      const rootData = {
        name: 'Root',
        children: nodes.map(n => mapToD3Node(n))
      };

      function mapToD3Node(node: TreeNode): any {
        const children: any[] = [];
        
        if (node.children && node.children.length > 0) {
          children.push(...node.children.map(mapToD3Node));
        }
        
        if (children.length > 0 && node.variables && node.variables.length > 0) {
          children.push({
            name: '', // Empty name for the dummy node
            value: Math.max(1, node.variables.length * 2),
            variables: node.variables,
            level: node.level + 1,
            nodeRef: node,
            isDummy: true
          });
        }
        
        return {
          name: node.name,
          children: children.length > 0 ? children : undefined,
          value: children.length > 0 ? 0 : Math.max(1, node.variables.length * 2), // Give weight based on variables
          variables: children.length > 0 ? [] : node.variables,
          level: node.level,
          nodeRef: node,
          isDummy: false
        };
      }

      const root = d3.hierarchy<any>(rootData)
        .sum(d => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      d3.treemap<any>()
        .size([width, height])
        .paddingTop(d => d.depth === 0 ? 0 : 32)
        .paddingRight(6)
        .paddingBottom(6)
        .paddingLeft(6)
        .paddingInner(6)
        .round(true)(root);

      const svg = d3.select(containerRef.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('font-family', 'Inter, sans-serif');

      const colorScale = d3.scaleOrdinal(d3.schemePastel1);

      // Draw all categories (both leaves and internal nodes)
      const categories = svg.selectAll('g.category')
        .data((root.descendants() as d3.HierarchyRectangularNode<any>[]).filter(d => d.depth > 0))
        .join('g')
        .attr('class', 'category')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

      categories.append('rect')
        .attr('fill', d => d.data.isDummy ? 'rgba(255,255,255,0.4)' : colorScale(d.data.name))
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill-opacity', d => d.children ? 0.2 : 0.6)
        .attr('stroke', d => d.data.isDummy ? 'rgba(255,255,255,0.5)' : '#fff')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', d => d.data.isDummy ? '4,4' : 'none')
        .attr('rx', 6)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          onNodeClick(d.data.nodeRef);
        })
        .on('mouseover', function(event, d) {
          d3.select(this).attr('stroke', '#94a3b8').attr('stroke-width', 3).attr('stroke-dasharray', 'none');
        })
        .on('mouseout', function(event, d) {
          d3.select(this)
            .attr('stroke', (d as any).data.isDummy ? 'rgba(255,255,255,0.5)' : '#fff')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', (d as any).data.isDummy ? '4,4' : 'none');
        });

      // Category Titles
      categories.append('text')
        .attr('x', 8)
        .attr('y', 20)
        .text(d => d.data.isDummy ? '' : d.data.name)
        .attr('font-size', d => d.depth === 1 ? '16px' : '14px')
        .attr('font-weight', '600')
        .attr('fill', '#1e293b')
        .style('pointer-events', 'none');

      // Delete button on treemap blocks
      const deleteBtns = categories.filter(d => (d.x1 - d.x0) > 40 && !d.data.isDummy).append('g')
        .attr('class', 'delete-btn')
        .attr('transform', d => `translate(${d.x1 - d.x0 - 26}, 6)`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          onNodeClick(d.data.nodeRef, 'delete');
        });

      deleteBtns.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('rx', 4)
        .attr('fill', 'white')
        .attr('fill-opacity', 0.8)
        .on('mouseover', function() { d3.select(this).attr('fill', '#fee2e2'); })
        .on('mouseout', function() { d3.select(this).attr('fill', 'white'); });

      deleteBtns.append('path')
        .attr('d', 'M3 6h12M8 6V4a2 2 0 012-2h2a2 2 0 012 2v2m3 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V6h10z')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1.5)
        .attr('fill', 'none')
        .attr('transform', 'scale(0.7) translate(3, 3)');

      // Variables as HTML tags inside foreignObject
      const leaves = categories.filter(d => !d.children);
      
      leaves.each(function(d) {
        const g = d3.select(this);
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        
        if (w > 24 && h > 36 && d.data.variables && d.data.variables.length > 0) {
          const fo = g.append('foreignObject')
            .attr('x', 6)
            .attr('y', d.data.isDummy ? 6 : 28)
            .attr('width', w - 12)
            .attr('height', d.data.isDummy ? h - 12 : h - 34)
            .style('pointer-events', 'none');
            
          const div = fo.append('xhtml:div')
            .style('display', 'flex')
            .style('flex-wrap', 'wrap')
            .style('gap', '6px')
            .style('padding', '2px')
            .style('width', '100%')
            .style('height', '100%')
            .style('overflow', 'hidden')
            .style('align-content', 'flex-start')
            .style('justify-content', 'center');
            
          d.data.variables.forEach((v: string) => {
            div.append('xhtml:span')
              .text(v)
              .style('background', 'white')
              .style('color', '#334155')
              .style('border', '1px solid #cbd5e1')
              .style('border-radius', '6px')
              .style('padding', '4px 8px')
              .style('font-size', '12px')
              .style('font-weight', '500')
              .style('white-space', 'nowrap')
              .style('box-shadow', '0 1px 2px rgba(0,0,0,0.05)');
          });
        }
      });
    };

    renderTreemap();

    window.addEventListener('resize', renderTreemap);
    return () => window.removeEventListener('resize', renderTreemap);
  }, [nodes, onNodeClick]);

  if (nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
        Click "Add Root Category" to start building your taxonomy.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full overflow-hidden rounded-xl" />;
}
