import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PebbleData, CognitiveLevel, MainBlock, SidebarBlock, IconType } from '../types';
import { CognitiveSlider } from '../components/CognitiveSlider';
import { 
  CheckCircle2, Circle, ArrowLeft, Quote, Activity, 
  Lightbulb, Library, Zap, Scale, Rocket, Search, BookOpen, User, Hash,
  Bold, Italic, Underline, Sparkles, RefreshCcw,
  Plus, ChevronUp, ChevronDown, Trash2, MoreVertical, X
} from 'lucide-react';

interface TheArtifactProps {
  pebble: PebbleData;
  onVerify: (pebbleId: string) => void;
  onBack: () => void;
  onUpdateContent: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', index: number, updatedBlock: MainBlock | SidebarBlock) => void;
  // ★★★ 新增 props ★★★
  onAddBlock: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', index: number, type: string) => void;
  onMoveBlock: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', fromIndex: number, direction: 'up' | 'down') => void;
  onDeleteBlock: (pebbleId: string, level: CognitiveLevel, section: 'main' | 'sidebar', index: number) => void;
  onUpdateEmoji: (pebbleId: string, level: CognitiveLevel, newEmojis: string[]) => void;
  // ★★★ 新增：更新层级元数据 (标题, 摘要, 关键词)
  onUpdateMetadata: (pebbleId: string, level: CognitiveLevel, field: 'title' | 'summary' | 'keywords', value: string | string[]) => void;
  // ★★★ 新增：更新全局 Pebble 数据 (苏格拉底问题)
  onUpdateGlobal: (pebbleId: string, field: 'socraticQuestions', value: string[]) => void;
}

// --- Icons Data & Helper ---
const ICON_TYPES: IconType[] = ['definition', 'history', 'idea', 'controversy', 'future', 'analysis', 'default'];

const getIconComponent = (type: IconType | undefined, size = 18, className = "") => {
  const baseClass = `inline-block mr-2 mb-1 ${className}`;
  switch (type) {
    case 'definition': return <Lightbulb size={size} className={`${baseClass} text-amber-500`} />;
    case 'history': return <Library size={size} className={`${baseClass} text-stone-500`} />;
    case 'idea': return <Zap size={size} className={`${baseClass} text-yellow-500`} />;
    case 'controversy': return <Scale size={size} className={`${baseClass} text-red-400`} />;
    case 'future': return <Rocket size={size} className={`${baseClass} text-indigo-400`} />;
    case 'analysis': return <Search size={size} className={`${baseClass} text-blue-400`} />;
    default: return <BookOpen size={size} className={`${baseClass} text-stone-400`} />;
  }
};

// --- Emojis Data for Picker ---
const PRESET_EMOJIS = [
  "💡", "🧠", "⚙️", "🏛️", "🚀", "⚖️", "🎨", "🌍", "🧬", "🔭", 
  "📚", "🔥", "🌊", "🌱", "🕸️", "🔗", "🧩", "🎤", "🎬", "🕹️",
  "🧱", "💎", "🛡️", "🔑", "🚪", "🗿", "📜", "🕯️", "⌛", "📡"
];

// --- 1. Editable Text Wrapper (The Core of Modeless Editing) ---

interface EditableTextProps {
  tagName: keyof React.JSX.IntrinsicElements;
  html: string;
  className?: string;
  placeholder?: string;
  onSave: (newHtml: string) => void;
  onFocus?: () => void;
}

const EditableText: React.FC<EditableTextProps> = ({ tagName: Tag, html, className, placeholder, onSave, onFocus }) => {
  const contentRef = useRef<HTMLElement>(null);
  
  const handleBlur = () => {
    if (contentRef.current) {
        const text = contentRef.current.innerText; // Use innerText for plain text model, or innerHTML if we want HTML
        if (text !== html) {
             onSave(text);
        }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      // Basic shortcuts if needed, e.g. Cmd+Enter to save/blur
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          contentRef.current?.blur();
      }
  };

  useEffect(() => {
    // Sync external updates if not focused
    if (contentRef.current && document.activeElement !== contentRef.current) {
         if (contentRef.current.innerText !== html) {
             contentRef.current.innerText = html;
         }
    }
  }, [html]);

  return (
    <Tag
      ref={contentRef}
      className={`outline-none transition-all rounded px-0.5 -mx-0.5 empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 hover:bg-stone-100/50 focus:bg-white focus:ring-1 focus:ring-stone-200 focus:shadow-sm ${className}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
    >
        {html}
    </Tag>
  );
};

// --- 2. Floating Bubble Menu (Formatting) ---

const FloatingMenu = () => {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setVisible(false);
            return;
        }

        const range = selection.getRangeAt(0);
        // Only show if selection is within an editable area
        const container = range.commonAncestorContainer.parentElement;
        if (!container?.isContentEditable) {
             setVisible(false);
             return;
        }

        const rect = range.getBoundingClientRect();
        setPosition({
            top: rect.top - 40 + window.scrollY, // 40px above
            left: rect.left + rect.width / 2
        });
        setVisible(true);
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', updatePosition);
        return () => document.removeEventListener('selectionchange', updatePosition);
    }, [updatePosition]);

    const exec = (command: string) => {
        document.execCommand(command, false);
    };

    if (!visible) return null;

    return (
        <div 
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 transform -translate-x-1/2 bg-stone-900 text-stone-200 rounded-full px-2 py-1 shadow-xl flex items-center gap-1 animate-in zoom-in-95 duration-100"
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
        >
            <button onClick={() => exec('bold')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full"><Bold size={14} /></button>
            <button onClick={() => exec('italic')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full"><Italic size={14} /></button>
            <button onClick={() => exec('underline')} className="p-1.5 hover:text-white hover:bg-stone-700 rounded-full"><Underline size={14} /></button>
            <div className="w-px h-4 bg-stone-700 mx-1" />
            <button className="p-1.5 hover:text-amber-300 hover:bg-stone-700 rounded-full flex items-center gap-1 text-xs font-bold text-amber-200/80">
                <Sparkles size={12} /> AI
            </button>
        </div>
    );
};

// --- 3. Semantic Pickers ---

const IconPicker: React.FC<{ current: IconType, onSelect: (t: IconType) => void, onClose: () => void }> = ({ current, onSelect, onClose }) => {
    return (
        <div className="absolute z-50 mt-2 bg-white border border-stone-200 rounded-lg shadow-xl p-2 grid grid-cols-4 gap-2 animate-in fade-in zoom-in-95">
            {ICON_TYPES.map(t => (
                <button 
                    key={t} 
                    onClick={() => { onSelect(t); onClose(); }}
                    className={`p-2 rounded hover:bg-stone-100 flex justify-center ${current === t ? 'bg-stone-100 ring-1 ring-stone-300' : ''}`}
                    title={t}
                >
                    {getIconComponent(t)}
                </button>
            ))}
        </div>
    );
};

const EmojiPicker: React.FC<{ onSelect: (e: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => {
    return (
        <div className="absolute z-50 mt-2 bg-white border border-stone-200 rounded-lg shadow-xl p-3 w-64 animate-in fade-in zoom-in-95">
            <div className="grid grid-cols-6 gap-2">
                {PRESET_EMOJIS.map(e => (
                    <button 
                        key={e} 
                        onClick={() => { onSelect(e); onClose(); }}
                        className="text-xl hover:bg-stone-100 rounded p-1 transition-colors hover:scale-110"
                    >
                        {e}
                    </button>
                ))}
            </div>
            <div className="mt-3 pt-2 border-t border-stone-100">
                <button onClick={() => { onSelect(PRESET_EMOJIS[Math.floor(Math.random() * PRESET_EMOJIS.length)]); onClose(); }} className="w-full text-xs font-bold text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1">
                   <RefreshCcw size={10} /> Randomize
                </button>
            </div>
        </div>
    );
};

// --- 4. Main Components Refactored ---

const EmojiCollageHero: React.FC<{ emojis: string[], onUpdate: (newEmojis: string[]) => void }> = ({ emojis, onUpdate }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden bg-stone-100 border-b border-stone-200 mb-8 select-none group">
       <div className="absolute inset-0 flex justify-center items-center opacity-90 scale-150 md:scale-125">
          {emojis.slice(0, 5).map((emoji, i) => (
             <div 
                key={i} 
                className="relative"
                style={{
                   zIndex: i,
                   transform: `translateX(${(i - 2) * 60}px) rotate(${(i - 2) * 10}deg)`,
                }}
             >
                 <span 
                    onClick={() => setActiveIdx(i)}
                    className="text-[8rem] md:text-[10rem] leading-none absolute cursor-pointer hover:brightness-110 hover:scale-105 transition-all"
                    style={{ textShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                 >
                    {emoji}
                 </span>
                 
                 {/* Emoji Picker Popover */}
                 {activeIdx === i && (
                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="fixed inset-0" onClick={(e) => { e.stopPropagation(); setActiveIdx(null); }} />
                        <EmojiPicker 
                            onSelect={(newEmoji) => {
                                const newArr = [...emojis];
                                newArr[i] = newEmoji;
                                onUpdate(newArr);
                            }} 
                            onClose={() => setActiveIdx(null)} 
                        />
                     </div>
                 )}
             </div>
          ))}
       </div>
       <div className="absolute inset-0 bg-gradient-to-t from-stone-50 to-transparent opacity-80 pointer-events-none" />
       
       {/* Hint */}
       <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur px-2 py-1 rounded text-xs text-stone-500 font-medium">
          Click emoji to swap
       </div>
    </div>
  );
};

// --- 组件 1: 插入区 (Add Zone) ---
const AddBlockZone: React.FC<{ 
    onAdd: (type: string) => void; 
    options: { label: string, type: string }[] 
}> = ({ onAdd, options }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative h-6 group flex items-center justify-center -my-3 z-10 hover:z-20">
            {/* 隐形触发区 */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsOpen(!isOpen)} />
            
            {/* 悬停显示的线和按钮 */}
            <div className={`w-full h-px bg-blue-500 transition-all duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`absolute bg-white border border-blue-500 text-blue-500 rounded-full p-0.5 transition-all duration-200 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}`}
            >
                <Plus size={14} />
            </button>

            {/* 类型选择菜单 */}
            {isOpen && (
                <div className="absolute top-6 bg-white border border-stone-200 shadow-xl rounded-lg p-1 flex gap-1 animate-in zoom-in-95">
                    {options.map(opt => (
                        <button 
                            key={opt.type}
                            onClick={() => { onAdd(opt.type); setIsOpen(false); }}
                            className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 rounded-md whitespace-nowrap"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
            
            {/* 点击外部关闭菜单的遮罩 */}
            {isOpen && <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />}
        </div>
    );
};

// --- 组件 2: 版块包装器 (带控制按钮) ---
const BlockWrapper: React.FC<{
    children: React.ReactNode;
    index: number;
    total: number;
    onMove: (dir: 'up' | 'down') => void;
    onDelete: () => void;
}> = ({ children, index, total, onMove, onDelete }) => {
    return (
        <div className="group/block relative -mx-4 px-4 py-2 rounded-xl transition-colors hover:bg-stone-100/50">
            {/* 控制按钮组 (悬停出现) */}
            <div className="absolute right-0 top-2 opacity-0 group-hover/block:opacity-100 transition-opacity flex flex-col gap-1 bg-white/80 backdrop-blur border border-stone-200 rounded-lg p-1 shadow-sm z-10 translate-x-full md:translate-x-0">
                <button 
                    disabled={index === 0}
                    onClick={() => onMove('up')}
                    className="p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded disabled:opacity-30"
                    title="Move Up"
                >
                    <ChevronUp size={14} />
                </button>
                <button 
                    disabled={index === total - 1}
                    onClick={() => onMove('down')}
                    className="p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded disabled:opacity-30"
                    title="Move Down"
                >
                    <ChevronDown size={14} />
                </button>
                <div className="h-px bg-stone-200 my-0.5" />
                <button 
                    onClick={onDelete}
                    className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            {children}
        </div>
    );
};

// --- MainContentRenderer (重构) ---
const MainContentRenderer: React.FC<{ 
    blocks: MainBlock[], 
    onUpdateBlock: (idx: number, b: MainBlock) => void,
    onAdd: (idx: number, type: string) => void,
    onMove: (idx: number, dir: 'up'|'down') => void,
    onDelete: (idx: number) => void
}> = ({ blocks, onUpdateBlock, onAdd, onMove, onDelete }) => {
  const [iconPickerIdx, setIconPickerIdx] = useState<number | null>(null);

  const MAIN_OPTIONS = [
      { label: 'Paragraph', type: 'text' },
      { label: 'Quote', type: 'pull_quote' },
      { label: 'Checklist', type: 'key_points' }
  ];

  return (
    <div className="space-y-6">
      {/* 顶部的添加区 */}
      <AddBlockZone onAdd={(t) => onAdd(0, t)} options={MAIN_OPTIONS} />

      {blocks.map((block, idx) => {
        const updateBody = (val: string | string[]) => onUpdateBlock(idx, { ...block, body: val });
        const updateHeading = (val: string) => onUpdateBlock(idx, { ...block, heading: val });
        const updateIcon = (val: IconType) => onUpdateBlock(idx, { ...block, iconType: val });

        // --- Block Content Rendering Logic (Same as before) ---
        let content = null;
        if (block.type === 'pull_quote') {
            content = (
              <div className="relative my-4 pl-6 border-l-4 border-stone-300">
                <Quote className="absolute -top-4 -left-3 text-stone-200 bg-stone-50 p-1" size={32} />
                <div className="font-display font-bold text-2xl md:text-3xl text-stone-800 leading-tight italic">
                  <EditableText tagName="div" html={block.body as string} onSave={updateBody} placeholder="Empty quote..." />
                </div>
                {/* ... author logic ... */}
              </div>
            );
        } else if (block.type === 'key_points') {
            const points = Array.isArray(block.body) ? block.body : [block.body as string];
            content = (
              <div className="bg-stone-100 rounded-xl p-6 border border-stone-200">
                {block.heading && (
                   <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle2 size={16} /> 
                      <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                   </h3>
                )}
                <ul className="space-y-3">
                   {points.map((p, i) => (
                      <li key={i} className="flex items-start gap-3 text-stone-700 font-serif text-lg leading-relaxed">
                         <span className="mt-2 w-1.5 h-1.5 bg-stone-400 rounded-full flex-shrink-0" />
                         <div className="flex-1">
                             <EditableText 
                                tagName="div" 
                                html={p} 
                                onSave={(newText) => {
                                    const newPoints = [...points];
                                    newPoints[i] = newText;
                                    updateBody(newPoints);
                                }}
                             />
                         </div>
                      </li>
                   ))}
                </ul>
              </div>
            );
        } else {
            // Default Text
            content = (
              <div className="prose prose-stone prose-lg max-w-none">
                 {block.heading && (
                    <div className="relative">
                        <h2 className="text-2xl md:text-3xl font-sans font-bold text-stone-900 mt-4 mb-4 flex items-center">
                            <button onClick={() => setIconPickerIdx(iconPickerIdx === idx ? null : idx)} className="hover:bg-stone-100 rounded p-1 -ml-1 mr-1 transition-colors">
                                {getIconComponent(block.iconType)}
                            </button>
                            <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                        </h2>
                        {iconPickerIdx === idx && (
                            <div className="absolute top-10 left-0 z-50">
                                <div className="fixed inset-0" onClick={() => setIconPickerIdx(null)} />
                                <IconPicker current={block.iconType || 'default'} onSelect={updateIcon} onClose={() => setIconPickerIdx(null)} />
                            </div>
                        )}
                    </div>
                 )}
                 <div className="text-stone-700 font-serif leading-8 text-lg md:text-xl whitespace-pre-line">
                    <EditableText tagName="div" html={block.body as string} onSave={updateBody} placeholder="Type paragraph..." />
                 </div>
              </div>
            );
        }

        return (
            <React.Fragment key={idx}>
                <BlockWrapper 
                    index={idx} 
                    total={blocks.length} 
                    onMove={(dir) => onMove(idx, dir)}
                    onDelete={() => onDelete(idx)}
                >
                    {content}
                </BlockWrapper>
                {/* 底部添加区 */}
                <AddBlockZone onAdd={(t) => onAdd(idx + 1, t)} options={MAIN_OPTIONS} />
            </React.Fragment>
        );
      })}
    </div>
  );
};

// --- SidebarRenderer (重构) ---
const SidebarRenderer: React.FC<{ 
    blocks: SidebarBlock[], 
    onUpdateBlock: (idx: number, b: SidebarBlock) => void,
    onAdd: (idx: number, type: string) => void,
    onMove: (idx: number, dir: 'up'|'down') => void,
    onDelete: (idx: number) => void
}> = ({ blocks, onUpdateBlock, onAdd, onMove, onDelete }) => {
  const [emojiPickerIdx, setEmojiPickerIdx] = useState<number | null>(null);
  
  const SIDEBAR_OPTIONS = [
      { label: 'Definition', type: 'definition' },
      { label: 'Profile', type: 'profile' },
      { label: 'Stat', type: 'stat' }
  ];

  return (
    <div className="space-y-4">
       <AddBlockZone onAdd={(t) => onAdd(0, t)} options={SIDEBAR_OPTIONS} />
       
       {blocks.map((block, idx) => {
          // ... (Update handlers same as before) ...
          const updateHeading = (v: string) => onUpdateBlock(idx, { ...block, heading: v });
          const updateBody = (v: string) => onUpdateBlock(idx, { ...block, body: v });
          const updateEmoji = (v: string) => onUpdateBlock(idx, { ...block, emoji: v });

          let content = null;
          // ... (Render Logic same as before, simplified for brevity) ...
          content = (
             <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                 {/* ... (Your existing render logic for profile/stat/def) ... */}
                 {block.type === 'profile' && (
                     <div className="flex items-start gap-4">
                         <div className="relative">
                             <button onClick={() => setEmojiPickerIdx(emojiPickerIdx === idx ? null : idx)} className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-2xl">
                                 {block.emoji || <User size={20} />}
                             </button>
                             {emojiPickerIdx === idx && (
                                <div className="absolute top-full left-0 z-50">
                                    <div className="fixed inset-0" onClick={() => setEmojiPickerIdx(null)} />
                                    <EmojiPicker onSelect={updateEmoji} onClose={() => setEmojiPickerIdx(null)} />
                                </div>
                             )}
                         </div>
                         <div className="flex-1">
                             <h4 className="font-bold"><EditableText tagName="span" html={block.heading} onSave={updateHeading} /></h4>
                             <div className="text-xs text-stone-500 mt-1"><EditableText tagName="div" html={block.body} onSave={updateBody} /></div>
                         </div>
                     </div>
                 )}
                 {block.type !== 'profile' && (
                     <>
                        <h4 className="font-bold text-stone-800 mb-2 flex items-center gap-2">
                            {block.type === 'stat' && <Hash size={12} className="text-stone-400"/>}
                            <EditableText tagName="span" html={block.heading} onSave={updateHeading} />
                        </h4>
                        <div className="text-sm text-stone-600"><EditableText tagName="div" html={block.body} onSave={updateBody} /></div>
                     </>
                 )}
             </div>
          );

          return (
            <React.Fragment key={idx}>
                <BlockWrapper 
                    index={idx} 
                    total={blocks.length} 
                    onMove={(dir) => onMove(idx, dir)}
                    onDelete={() => onDelete(idx)}
                >
                    {content}
                </BlockWrapper>
                <AddBlockZone onAdd={(t) => onAdd(idx + 1, t)} options={SIDEBAR_OPTIONS} />
            </React.Fragment>
          );
       })}
    </div>
  );
};

export const TheArtifact: React.FC<TheArtifactProps> = ({ 
  pebble, 
  onVerify, 
  onBack, 
  onUpdateContent, 
  onUpdateEmoji, 
  onUpdateMetadata, 
  onUpdateGlobal,
  onAddBlock,
  onMoveBlock,
  onDeleteBlock
}) => {
  const [level, setLevel] = useState<CognitiveLevel>(CognitiveLevel.ELI5);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  
  // 实时获取当前的 verified 状态，如果 pebble.isVerified 为 true，则锁定
  // 但为了允许编辑，我们需要放宽锁定逻辑，或者允许在解锁状态下编辑
  // 这里简化逻辑：始终允许编辑内容，但在视觉上保持 verified 的绿色状态
  const isLocked = pebble.isVerified; 

  const content = pebble.content[level];
  const questions = pebble.socraticQuestions || [];

  // --- Helpers for Socratic Logic ---

  const updateQuestions = (newQuestions: string[]) => {
      onUpdateGlobal(pebble.id, 'socraticQuestions', newQuestions);
  };

  const handleToggleQuestion = (index: number) => {
    const newSet = new Set(completedQuestions);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setCompletedQuestions(newSet);
    
    // 只有当所有问题都存在且都被勾选时才触发 Verify
    if (questions.length > 0 && newSet.size === questions.length && !isLocked) {
        onVerify(pebble.id);
    }
  };

  const handleEditQuestion = (index: number, newVal: string) => {
      const newQuestions = [...questions];
      newQuestions[index] = newVal;
      updateQuestions(newQuestions);
  };

  const handleAddQuestion = () => {
      const newQuestions = [...questions, "New reflection question..."];
      updateQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index: number) => {
      const newQuestions = questions.filter((_, i) => i !== index);
      updateQuestions(newQuestions);
      // 清理勾选状态，防止索引错位
      const newSet = new Set<number>();
      setCompletedQuestions(newSet);
  };

  const handleDeleteSection = () => {
      if(confirm("Remove the Socratic Verification section?")) {
          updateQuestions([]); // 清空数组即视为删除板块
      }
  };

  const handleRestoreSection = () => {
      updateQuestions(["Why is this concept important?", "How does this apply to your work?", "What is a potential counter-argument?"]);
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-32 fade-in font-sans selection:bg-stone-800 selection:text-stone-50">
        
        {/* Navigation */}
        <button 
            onClick={onBack}
            className="fixed top-6 left-6 z-40 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm hover:bg-stone-100 transition-colors border border-stone-200"
        >
            <ArrowLeft size={20} className="text-stone-600" />
        </button>

        {/* Hero Section */}
        {/* @ts-ignore */}
        <EmojiCollageHero emojis={content.emojiCollage} onUpdate={(newEmojis) => onUpdateEmoji(pebble.id, level, newEmojis)} />

        {/* Title Header */}
        <div className="max-w-6xl mx-auto px-6 md:px-8 mb-12 border-b border-stone-200 pb-8">
             <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-3">
                     <span className="bg-stone-900 text-stone-100 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {level === CognitiveLevel.ELI5 ? 'Analogy Mode' : 'Academic Mode'}
                     </span>
                     <span className="text-stone-400 text-sm font-medium">
                        {new Date(pebble.timestamp).toLocaleDateString()}
                     </span>
                 </div>
                 
                 <div className="text-4xl md:text-6xl font-display font-bold text-stone-900 leading-tight tracking-tight">
                    <EditableText 
                        tagName="h1" 
                        html={content.title} 
                        onSave={(val) => onUpdateMetadata(pebble.id, level, 'title', val)}
                    />
                 </div>

                 <div className="text-xl md:text-2xl text-stone-500 font-serif max-w-3xl leading-relaxed">
                    <EditableText 
                        tagName="p" 
                        html={content.summary} 
                        onSave={(val) => onUpdateMetadata(pebble.id, level, 'summary', val)}
                    />
                 </div>

                 <div className="flex flex-wrap gap-2 mt-2">
                    {content.keywords.map((k, i) => (
                       <span key={i} className="text-xs font-bold text-stone-400 uppercase tracking-wide bg-stone-100 px-1.5 py-0.5 rounded hover:bg-stone-200 transition-colors cursor-text">
                           #<EditableText 
                               tagName="span" 
                               html={k} 
                               onSave={(val) => {
                                   const newKeys = [...content.keywords];
                                   newKeys[i] = val;
                                   onUpdateMetadata(pebble.id, level, 'keywords', newKeys);
                               }} 
                           />
                       </span>
                    ))}
                 </div>
             </div>
        </div>

        {/* Magazine Layout Grid */}
        <div className="max-w-6xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Main Column */}
            <div className="lg:col-span-8">
                <MainContentRenderer 
                    blocks={content.mainContent} 
                    onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'main', idx, b)}
                    onAdd={(idx, type) => onAddBlock(pebble.id, level, 'main', idx, type)}
                    onMove={(idx, dir) => onMoveBlock(pebble.id, level, 'main', idx, dir)}
                    onDelete={(idx) => onDeleteBlock(pebble.id, level, 'main', idx)}
                />
                
                {/* --- SOCRATIC VERIFICATION SECTION (EDITABLE) --- */}
                {questions.length > 0 ? (
                    <div className={`mt-20 rounded-2xl p-8 border transition-all duration-500 group/socratic relative ${isLocked ? 'bg-stone-900 text-stone-100 border-stone-800' : 'bg-white border-stone-200 shadow-sm'}`}>
                        
                        {/* Header with Delete Section Button */}
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-display font-bold text-xl flex items-center gap-3">
                                {isLocked ? <CheckCircle2 className="text-green-400" /> : <Circle className="text-stone-400" />}
                                Socratic Verification
                            </h3>
                            <button 
                                onClick={handleDeleteSection}
                                className="opacity-0 group-hover/socratic:opacity-100 p-2 hover:bg-red-100 hover:text-red-500 text-stone-400 rounded transition-all"
                                title="Remove Section"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-4">
                            {questions.map((q, idx) => (
                                <div 
                                    key={idx} 
                                    className={`group/item relative p-4 rounded-xl border transition-all flex items-start gap-4 ${
                                        isLocked 
                                        ? 'bg-stone-800 border-stone-700' 
                                        : completedQuestions.has(idx) 
                                            ? 'bg-stone-50 border-stone-200 opacity-60' 
                                            : 'bg-stone-50 border-stone-100 hover:border-stone-300 hover:shadow-md'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <div 
                                        onClick={() => handleToggleQuestion(idx)}
                                        className={`mt-1 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                                        completedQuestions.has(idx) || isLocked ? 'border-transparent bg-green-500' : 'border-stone-300'
                                    }`}>
                                        {(completedQuestions.has(idx) || isLocked) && <CheckCircle2 size={12} className="text-white" />}
                                    </div>
                                    
                                    {/* Editable Text */}
                                    <div className={`flex-1 text-base font-serif leading-relaxed ${isLocked ? 'text-stone-300' : 'text-stone-700'}`}>
                                        <EditableText 
                                            tagName="div" 
                                            html={q} 
                                            onSave={(val) => handleEditQuestion(idx, val)} 
                                        />
                                    </div>

                                    {/* Delete Single Question Button */}
                                    <button 
                                        onClick={() => handleDeleteQuestion(idx)}
                                        className="opacity-0 group-hover/item:opacity-100 absolute right-2 top-2 p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-200 rounded transition-all"
                                        title="Delete Question"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add Question Button */}
                        <div className="mt-6 flex justify-center">
                            <button 
                                onClick={handleAddQuestion}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                                    isLocked 
                                    ? 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200' 
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                                }`}
                            >
                                <Plus size={16} /> Add Question
                            </button>
                        </div>
                    </div>
                ) : (
                    // Empty State / Restore Button
                    <div className="mt-20 border-t border-stone-200 pt-8 flex justify-center">
                        <button 
                            onClick={handleRestoreSection}
                            className="group flex flex-col items-center gap-2 text-stone-400 hover:text-blue-500 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-stone-300 group-hover:border-blue-400 flex items-center justify-center">
                                <Plus size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Add Verification Layer</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 hidden lg:block">
                <div className="sticky top-8">
                    <div className="mb-4 text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 pb-2">
                        Context & Data
                    </div>
                    {/* @ts-ignore */}
                    <SidebarRenderer 
                        blocks={content.sidebarContent} 
                        onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'sidebar', idx, b)}
                        onAdd={(idx, type) => onAddBlock(pebble.id, level, 'sidebar', idx, type)}
                        onMove={(idx, dir) => onMoveBlock(pebble.id, level, 'sidebar', idx, dir)}
                        onDelete={(idx) => onDeleteBlock(pebble.id, level, 'sidebar', idx)}
                    />
                </div>
            </div>

            {/* Mobile Sidebar */}
            <div className="lg:hidden space-y-6 mt-12 pt-12 border-t border-stone-200">
                 {/* ... (Mobile sidebar logic same as desktop) ... */}
                 {/* @ts-ignore */}
                 <SidebarRenderer 
                    blocks={content.sidebarContent} 
                    onUpdateBlock={(idx, b) => onUpdateContent(pebble.id, level, 'sidebar', idx, b)}
                    onAdd={(idx, type) => onAddBlock(pebble.id, level, 'sidebar', idx, type)}
                    onMove={(idx, dir) => onMoveBlock(pebble.id, level, 'sidebar', idx, dir)}
                    onDelete={(idx) => onDeleteBlock(pebble.id, level, 'sidebar', idx)}
                 />
            </div>

        </div>
        
        {/* @ts-ignore */}
        <FloatingMenu />
        
        <CognitiveSlider level={level} onChange={setLevel} />
    </div>
  );
};