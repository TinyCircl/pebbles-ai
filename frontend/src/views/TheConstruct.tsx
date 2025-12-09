// frontend/src/views/TheConstruct.tsx

import React, { useEffect, useState } from 'react';
import { GenerationTask } from '../types';

interface TheConstructProps {
  task: GenerationTask;
}

export const TheConstruct: React.FC<TheConstructProps> = ({ task }) => {
  const [localLogs, setLocalLogs] = useState(task.logs);

  useEffect(() => {
    setLocalLogs(task.logs);
  }, [task.logs]);

  // Dynamic background style based on progress
  const phase = task.progress * 2.5;
  const bgStyle = {
    backgroundColor: `rgb(${250 - phase/2}, ${250 - phase/2}, ${249 - phase/2})`,
    color: phase > 120 ? '#fafaf9' : '#1c1917',
    // 确保颜色变化平滑
    transition: 'background-color 1s ease, color 1s ease'
  };

  return (
    <div 
      // 移除这里的 transition-colors，改用上面 style 里的 transition，控制更精确
      className="h-screen w-full flex flex-col items-center justify-center font-mono text-sm overflow-hidden"
      style={bgStyle}
    >
      {/* 1. 更新 CSS 动画定义：动态省略号 */}
      <style>{`
        @keyframes ellipsis-animation {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        
        .loading-ellipsis:after {
          content: '';
          display: inline-block;
          /* 使用 steps(1) 让变化是跳跃的，更有终端感 */
          animation: ellipsis-animation 2s steps(1) infinite;
          /* 重要：预留 3个字符的宽度，防止点出现时导致文字抖动 */
          width: 3ch; 
          text-align: left;
        }
      `}</style>

      <div className="w-full max-w-md p-6 space-y-2">
        <div className="mb-8 font-display font-bold text-xl opacity-80 border-b border-current pb-2">
            Constructing: {task.topic}
        </div>
        
        {localLogs.map((log, i) => (
          <div key={log.timestamp + i} className="opacity-0 animate-[fadeIn_0.5s_forwards]">
            <span className="opacity-50 mr-2">{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}</span>
            {log.message}
          </div>
        ))}
        
        {/* 2. 修改底部指示器部分 */}
        {task.status === 'generating' && (
            <div className="pt-2 flex items-center text-base font-bold opacity-80">
                {/* 这里不需要再手动设置 style={{ color }} 了，
                   因为它的父级 div 已经设置了 color，它会自动继承 (currentColor)。
                */}
                <span className="mr-2">Thinking</span>
                {/* 应用新的 loading-ellipsis 类 */}
                <span className="loading-ellipsis"></span>
            </div>
        )}
      </div>
    </div>
  );
};