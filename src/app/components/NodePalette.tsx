import { useDrag } from 'react-dnd';
import { 
  Play, 
  CheckCircle, 
  Database, 
  FileCode, 
  Code, 
  Calendar,
  GitBranch,
  GitMerge,
  Clock,
  RotateCw,
  Workflow,
  Globe,
  FileUp,
  Bell
} from 'lucide-react';

interface PaletteItemProps {
  nodeType: string;
  label: string;
  icon: React.ReactNode;
  category: string;
}

const PaletteItem = ({ nodeType, label, icon, category }: PaletteItemProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'palette-item',
    item: { nodeType, label },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:border-blue-500 hover:shadow transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
};

export function NodePalette() {
  const executionNodes = [
    { type: 'sql-agent', label: 'SQL Agent', icon: <Database className="w-4 h-4 text-blue-600" /> },
    { type: 'stored-proc', label: '存储过程', icon: <Database className="w-4 h-4 text-blue-600" /> },
    { type: 'sql-script', label: 'SQL脚本', icon: <FileCode className="w-4 h-4 text-blue-600" /> },
    { type: 'python', label: 'Python', icon: <Code className="w-4 h-4 text-purple-600" /> },
    { type: 'windows-task', label: 'Windows Task', icon: <Calendar className="w-4 h-4 text-orange-600" /> },
  ];

  const controlNodes = [
    { type: 'start', label: '开始', icon: <Play className="w-4 h-4 text-green-600" /> },
    { type: 'end', label: '结束', icon: <CheckCircle className="w-4 h-4 text-gray-600" /> },
    { type: 'condition', label: '条件分支', icon: <GitBranch className="w-4 h-4 text-yellow-600" /> },
    { type: 'parallel', label: '并行汇聚', icon: <GitMerge className="w-4 h-4 text-indigo-600" /> },
    { type: 'delay', label: '延迟', icon: <Clock className="w-4 h-4 text-orange-600" /> },
    { type: 'retry', label: '重试块', icon: <RotateCw className="w-4 h-4 text-red-600" /> },
    { type: 'subflow', label: '子流程', icon: <Workflow className="w-4 h-4 text-teal-600" /> },
  ];

  const eventNodes = [
    { type: 'webhook', label: 'Webhook', icon: <Globe className="w-4 h-4 text-pink-600" /> },
    { type: 'file-arrival', label: '文件到达', icon: <FileUp className="w-4 h-4 text-cyan-600" /> },
    { type: 'upstream', label: '上游完成', icon: <Bell className="w-4 h-4 text-amber-600" /> },
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">节点库</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase">执行节点</h4>
            <div className="space-y-2">
              {executionNodes.map((node) => (
                <PaletteItem
                  key={node.type}
                  nodeType={node.type}
                  label={node.label}
                  icon={node.icon}
                  category="execution"
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase">控制节点</h4>
            <div className="space-y-2">
              {controlNodes.map((node) => (
                <PaletteItem
                  key={node.type}
                  nodeType={node.type}
                  label={node.label}
                  icon={node.icon}
                  category="control"
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase">事件节点</h4>
            <div className="space-y-2">
              {eventNodes.map((node) => (
                <PaletteItem
                  key={node.type}
                  nodeType={node.type}
                  label={node.label}
                  icon={node.icon}
                  category="event"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
