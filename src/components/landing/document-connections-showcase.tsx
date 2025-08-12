
"use client";

import { useEffect, useRef, useState } from 'react';
import { Folder, FileText, Users, Archive, Banknote, UserCog, FolderInput } from 'lucide-react';
import '@/app/document-connections-showcase.css';

const nodes = [
  { id: 'invoices', label: 'Invoices', x: 1, y: 1, icon: Folder, active: true },
  { id: 'contracts', label: 'Contracts', x: 2, y: 2, icon: FileText, active: true },
  { id: 'team', label: 'Team Alpha', x: 3, y: 1, icon: Users, active: true },
  // faded nodes
  { id: 'archive', label: '', x: 1, y: 3, icon: Archive, active: false },
  { id: 'finance', label: '', x: 2, y: 3, icon: Banknote, active: false },
  { id: 'hr', label: '', x: 3, y: 3, icon: UserCog, active: false },
  { id: 'misc', label: '', x: 4, y: 2, icon: FolderInput, active: false },
];


function getNodePos(x: number, y: number) {
  // grid: 4 cols x 3 rows, 120px spacing
  return { left: `${x * 120}px`, top: `${y * 120}px` };
}


export function DocumentConnectionsShowcase() {
  // Animate which connection is "active"
  const [activeLine, setActiveLine] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLine((prev) => (prev + 1) % 2);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Path data for animated dot
  const paths = [
    "M 120 120 Q 180 180 240 240", // Invoices → Contracts
    "M 240 240 Q 300 120 360 120"  // Contracts → Team Alpha
  ];

  return (
    <section className="w-full bg-[#f8fafd] py-24 md:py-32">
      <div className="container mx-auto flex flex-col md:flex-row items-center gap-12 px-4 md:px-8">
        <div className="flex-1 max-w-lg">
          <span className="text-primary font-semibold text-sm mb-2 block">Automated Workflows</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">A connected document platform for teams</h2>
          <p className="text-lg text-slate-600 mb-6">Visualize how Docuflow connects your folders, documents, and teams. Automate flows, share securely, and keep everyone in sync—no matter how complex your document structure.</p>
        </div>
        <div className="flex-1 relative min-h-[420px] min-w-[480px]">
          {/* SVG lines with animated dot */}
          <svg className="absolute left-0 top-0 w-full h-full pointer-events-none" width="480" height="360">
            <defs>
              <linearGradient id="docuflow-conn" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#a78bfa" />
                <stop offset="1" stopColor="#f472b6" />
              </linearGradient>
            </defs>
            {/* Invoices → Contracts */}
            <path d={paths[0]} stroke="url(#docuflow-conn)" strokeWidth="4" fill="none" className="animate-dash" />
            {/* Contracts → Team Alpha */}
            <path d={paths[1]} stroke="url(#docuflow-conn)" strokeWidth="4" fill="none" className="animate-dash" />
            {/* Animated dot on active line */}
            <AnimatedDot path={paths[activeLine]} />
          </svg>
          {/* Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute flex flex-col items-center justify-center transition-all duration-300 ${node.active ? 'bg-white shadow-xl border-2 border-primary scale-110 z-10' : 'bg-white/60 border border-slate-200 grayscale opacity-60'} rounded-xl p-4 min-w-[80px] min-h-[80px]`}
              style={getNodePos(node.x, node.y)}
            >
              {node.icon && (
                <node.icon size={36} className={node.active ? 'text-primary' : 'text-slate-400'} />
              )}
              {node.label && <span className="mt-2 font-semibold text-primary text-sm">{node.label}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
// (removed extra closing brace)

// Animated dot that travels along a path
function AnimatedDot({ path }: { path: string }) {
  const ref = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 2000;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(elapsed / duration, 1);
      if (ref.current) {
        const len = ref.current.getTotalLength();
        const point = ref.current.getPointAtLength(t * len);
        setPos({ x: point.x, y: point.y });
      }
      if (t < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [path]);

  return (
    <>
      <path ref={ref} d={path} style={{ display: 'none' }} />
      <circle
        className="animated-dot"
        cx={pos.x}
        cy={pos.y}
        r={10}
        style={{ transition: 'fill 0.2s' }}
      />
    </>
  );
}
}
