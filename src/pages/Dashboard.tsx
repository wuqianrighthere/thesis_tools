import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { differenceInDays, parseISO, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [models, setModels] = useState<any[]>([]);
  const [config, setConfig] = useState({ targetDate: '2026-05-15' });
  const [loading, setLoading] = useState(true);

  const [dailyTarget, setDailyTarget] = useState<number | null>(null);
  const [showGoalPrompt, setShowGoalPrompt] = useState(false);
  const [goalInput, setGoalInput] = useState(5);
  const [generating, setGenerating] = useState(false);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;

    // Fetch config
    const unsubscribeConfig = onSnapshot(doc(db, 'systemConfig', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as any);
      }
    });

    // Fetch daily goal
    const unsubscribeGoal = onSnapshot(doc(db, 'users', user.uid, 'dailyGoals', todayStr), (docSnap) => {
      if (docSnap.exists()) {
        setDailyTarget(docSnap.data().target);
        setShowGoalPrompt(false);
      } else {
        setShowGoalPrompt(true);
      }
    });

    // Fetch user models
    const q = query(collection(db, 'modelCards'));
    const unsubscribeModels = onSnapshot(q, (snapshot) => {
      setModels(snapshot.docs.map(d => d.data()));
      setLoading(false);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeGoal();
      unsubscribeModels();
    };
  }, [user, todayStr]);

  const handleSetGoal = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'dailyGoals', todayStr), {
        target: goalInput,
        date: todayStr
      });
    } catch (error) {
      console.error("Failed to set goal", error);
    }
  };

  const handleGenerateSamples = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const daysAgo = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - days);
        return Timestamp.fromDate(d);
      };

      const samples = [
        {
          userId: user.uid,
          uploaderName: "Generated",
          title: "The impact of transformational leadership on innovative work behavior",
          journal: "Journal of Applied Psychology",
          conceptualMap: "Transformational Leadership -> Psychological Safety -> Innovative Work Behavior",
          iv: ["Transformational Leadership"],
          mediator: ["Psychological Safety"],
          moderator: ["Task Interdependence"],
          dv: ["Innovative Work Behavior"],
          wowFactor: "The use of psychological safety as a mediator explains the black box of leadership impact on creativity.",
          createdAt: daysAgo(0)
        },
        {
          userId: user.uid,
          uploaderName: "Generated",
          title: "Abusive supervision and turnover intention",
          journal: "Academy of Management Journal",
          conceptualMap: "Abusive Supervision -> Emotional Exhaustion -> Turnover Intention",
          iv: ["Abusive Supervision"],
          mediator: ["Emotional Exhaustion"],
          moderator: ["Perceived Organizational Support"],
          dv: ["Turnover Intention"],
          wowFactor: "Shows that organizational support can buffer the negative effects of bad managers.",
          createdAt: daysAgo(0)
        },
        {
          userId: user.uid,
          uploaderName: "Generated",
          title: "High-Performance Work Systems and Task Performance",
          journal: "Personnel Psychology",
          conceptualMap: "HPWS -> Employee Engagement -> Task Performance",
          iv: ["High-Performance Work Systems"],
          mediator: ["Employee Engagement"],
          moderator: ["Proactive Personality"],
          dv: ["Task Performance"],
          wowFactor: "Highlights that system-level HR practices translate to individual performance via engagement.",
          createdAt: daysAgo(1)
        },
        {
          userId: user.uid,
          uploaderName: "Generated",
          title: "Telecommuting and Job Satisfaction",
          journal: "Journal of Management",
          conceptualMap: "Telecommuting -> Work-Family Conflict -> Job Satisfaction",
          iv: ["Telecommuting"],
          mediator: ["Work-Family Conflict"],
          moderator: ["Boundary Management Preference"],
          dv: ["Job Satisfaction"],
          wowFactor: "Counterintuitively shows telecommuting can increase conflict if boundaries aren't managed.",
          createdAt: daysAgo(3)
        },
        {
          userId: user.uid,
          uploaderName: "Generated",
          title: "Inclusive Leadership and Team Creativity",
          journal: "Leadership Quarterly",
          conceptualMap: "Inclusive Leadership -> Team Cohesion -> Team Creativity",
          iv: ["Inclusive Leadership"],
          mediator: ["Team Cohesion"],
          moderator: ["Task Complexity"],
          dv: ["Team Creativity"],
          wowFactor: "Demonstrates that inclusion matters most when tasks are highly complex.",
          createdAt: daysAgo(3)
        },
        {
          userId: user.uid,
          uploaderName: "Generated",
          title: "Servant Leadership and OCB",
          journal: "Journal of Business Ethics",
          conceptualMap: "Servant Leadership -> Trust in Leader -> Organizational Citizenship Behavior",
          iv: ["Servant Leadership"],
          mediator: ["Trust in Leader"],
          moderator: ["Follower Needs for Autonomy"],
          dv: ["Organizational Citizenship Behavior"],
          wowFactor: "Trust is the key mechanism for servant leaders to inspire extra-role behaviors.",
          createdAt: daysAgo(10)
        },
        {
          userId: user.uid,
          uploaderName: "Generated",
          title: "Workplace Ostracism and Counterproductive Work Behavior",
          journal: "Journal of Applied Psychology",
          conceptualMap: "Workplace Ostracism -> State Anger -> CWB",
          iv: ["Workplace Ostracism"],
          mediator: ["State Anger"],
          moderator: ["Trait Anger"],
          dv: ["Counterproductive Work Behavior"],
          wowFactor: "Ostracism is sometimes more harmful than overt harassment.",
          createdAt: daysAgo(10)
        },
        {
          userId: user.uid,
          uploaderName: "Generated",
          title: "Algorithmic Management and Worker Well-being",
          journal: "Academy of Management Discoveries",
          conceptualMap: "Algorithmic Control -> Autonomy Frustration -> Burnout",
          iv: ["Algorithmic Control"],
          mediator: ["Autonomy Frustration"],
          moderator: ["Algorithmic Transparency"],
          dv: ["Burnout"],
          wowFactor: "Transparency can mitigate the negative effects of algorithmic control.",
          createdAt: daysAgo(15)
        }
      ];

      for (const sample of samples) {
        await addDoc(collection(db, 'modelCards'), sample);
      }
      alert('Sample data generated successfully!');
    } catch (error) {
      console.error("Error generating samples", error);
      alert('Failed to generate samples.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  if (showGoalPrompt) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Welcome back!</h2>
          <p className="text-stone-500 mb-8">Set your research extraction goal for today.</p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <button onClick={() => setGoalInput(Math.max(1, goalInput - 1))} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 text-xl font-medium transition-all cursor-pointer active:scale-95">-</button>
            <span className="text-5xl font-light text-stone-900 w-20">{goalInput}</span>
            <button onClick={() => setGoalInput(goalInput + 1)} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 text-xl font-medium transition-all cursor-pointer active:scale-95">+</button>
          </div>
          <button
            onClick={handleSetGoal}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all cursor-pointer active:scale-95"
          >
            Start Today's Mission
          </button>
        </div>
      </div>
    );
  }

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let daysLeft = 0;
  try {
    const targetDateObj = parseISO(config.targetDate);
    daysLeft = differenceInDays(targetDateObj, today);
  } catch (e) {
    // Fallback if date is invalid
  }

  // Heatmap calculations
  const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
  const daysToShow = 84 + dayOfWeek + 1; // 12 full weeks + current week
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToShow + 1);

  const calendarDays = Array.from({ length: daysToShow }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return format(d, 'yyyy-MM-dd');
  });

  const getColor = (count: number) => {
    if (count === 0) return 'bg-stone-100';
    if (count === 1) return 'bg-blue-200';
    if (count <= 3) return 'bg-blue-400';
    if (count <= 5) return 'bg-blue-600';
    return 'bg-blue-800';
  };

  // Group models by user to support multiple users in the future
  const userMap = new Map();
  if (user) {
    userMap.set(user.uid, {
      userId: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Me',
      models: []
    });
  }

  models.forEach(m => {
    const uid = m.userId || 'unknown';
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        userId: uid,
        name: m.uploaderName || 'Unknown',
        models: []
      });
    } else if (m.uploaderName && userMap.get(uid).name === 'Me') {
      userMap.get(uid).name = m.uploaderName;
    }
    userMap.get(uid).models.push(m);
  });

  const teamStats = Array.from(userMap.values()).map(stat => {
    const todayModels = stat.models.filter((m: any) => m.createdAt && m.createdAt.toDate() >= startOfToday);
    const todayCount = todayModels.length;
    const target = stat.userId === user?.uid ? (dailyTarget || 5) : 5; // Default to 5 for others for now
    const progress = Math.min((todayCount / target) * 100, 100);

    const countsByDate = stat.models.reduce((acc: Record<string, number>, m: any) => {
      if (!m.createdAt) return acc;
      const d = format(m.createdAt.toDate(), 'yyyy-MM-dd');
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

    return { ...stat, todayCount, target, progress, countsByDate };
  }).sort((a, b) => {
    if (a.userId === user?.uid) return -1;
    if (b.userId === user?.uid) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleDayClick = (dateStr: string) => {
    navigate(`/models?date=${dateStr}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start sm:items-end flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Dashboard</h1>
          <p className="text-stone-500 mt-2">Track your daily research extraction goals.</p>
        </div>
        <button
          onClick={handleGenerateSamples}
          disabled={generating}
          className="text-xs px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {generating ? 'Generating...' : 'Generate OB Samples'}
        </button>
      </div>

      {/* Global Countdown */}
      <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium text-stone-600">Today is {format(today, 'MMMM d, yyyy')}</h3>
          <p className="text-xs text-stone-400 mt-1">Target: {config.targetDate}</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-light text-stone-900">{daysLeft > 0 ? daysLeft : 0}</span>
          <span className="text-sm text-stone-500 ml-1">days left</span>
        </div>
      </div>

      {/* Team Stats */}
      <div className="space-y-8">
        {teamStats.map(stat => (
          <div key={stat.userId} className="space-y-4">
            <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-200 pb-2">
              {stat.userId === user?.uid ? 'Your Progress' : `${stat.name}'s Progress`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Progress */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-sm font-medium text-stone-500 mb-4">Today's Mission</h3>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-5xl font-light tracking-tighter text-stone-900">{stat.todayCount}</span>
                    <span className="text-lg text-stone-400 font-medium mb-1">/ {stat.target}</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-4 overflow-hidden relative">
                    <div
                      className="bg-emerald-500 h-4 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${stat.progress}%` }}
                    />
                    {stat.progress >= 100 && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                        COMPLETED
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200">
                <h3 className="text-sm font-medium text-stone-600 mb-3">Activity</h3>
                <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">
                  {calendarDays.map(date => (
                    <div
                      key={date}
                      onClick={() => handleDayClick(date)}
                      title={`${date}: ${stat.countsByDate[date] || 0} models`}
                      className={`w-3 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-stone-400 transition-all ${getColor(stat.countsByDate[date] || 0)}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
