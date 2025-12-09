import React, { useState, useEffect } from 'react';
import { ViewState, PebbleData, Folder, GenerationTask, CognitiveLevel, MainBlock, SidebarBlock } from './types';
import { TheDrop } from './views/TheDrop';
import { TheConstruct } from './views/TheConstruct';
import { TheArtifact } from './views/TheArtifact';
import { TheArchive } from './views/TheArchive';
import { AuthView } from './views/AuthView'; // 新增：认证视图
import { ArchiveSidebar } from './components/ArchiveSidebar';
import { pebbleApi, folderApi } from './services/api'; // 新增：API 服务
import { CheckCircle2, ArrowRight, Loader2, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.DROP);
  
  // Auth & Loading State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data Store
  const [archive, setArchive] = useState<PebbleData[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  // Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('pebbles_sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });

  // Input State
  const [currentReferences, setCurrentReferences] = useState<PebbleData[]>([]);
  const [isImmersionMode, setIsImmersionMode] = useState(false);

  // Active View State
  const [activePebble, setActivePebble] = useState<PebbleData | null>(null);

  // Async Generation Task State
  const [generationTask, setGenerationTask] = useState<GenerationTask | null>(null);
  const [showCompletionToast, setShowCompletionToast] = useState(false);

  // --- 1. Initialization & Data Loading ---

  useEffect(() => {
    const token = localStorage.getItem('pebbles_token');
    if (token) {
      setIsAuthenticated(true);
      loadUserData();
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const [fetchedPebbles, fetchedFolders] = await Promise.all([
        pebbleApi.getAll(),
        folderApi.getAll()
      ]);
      setArchive(fetchedPebbles);
      setFolders(fetchedFolders);
    } catch (error) {
      console.error("Failed to load data", error);
      // 如果 Token 失效，api interceptor 会处理跳转，这里只需停止 loading
    } finally {
      setIsLoading(false);
    }
  };

  // ★★★ 新增：处理退出登录 ★★★
  const handleLogout = () => {
    // 1. 清除本地存储的 Token
    localStorage.removeItem('pebbles_token');
    
    // 2. 重置所有状态（防止下个用户看到上个用户的数据缓存）
    setArchive([]);
    setFolders([]);
    setGenerationTask(null);
    setActivePebble(null);
    setCurrentReferences([]);
    
    // 3. 更新认证状态，这会触发页面重新渲染为 AuthView
    setIsAuthenticated(false);
  };

  // Persist sidebar width
  const handleSetSidebarWidth = (width: number) => {
    setSidebarWidth(width);
    localStorage.setItem('pebbles_sidebar_width', width.toString());
  };

  // --- 2. Core Generation Logic (Connected to Backend) ---

  const handleStartConstruct = async (topic: string) => {
    const taskId = crypto.randomUUID();
    
    // Initialize Task (Frontend Simulation for UX)
    const newTask: GenerationTask = {
        id: taskId,
        status: 'generating',
        topic,
        logs: [{ message: `> Analyzing intent: "${topic}"...`, timestamp: Date.now() }],
        progress: 10
    };
    setGenerationTask(newTask);
    setViewState(ViewState.CONSTRUCT);

    const updateTask = (updates: Partial<GenerationTask>) => {
        setGenerationTask(prev => prev && prev.id === taskId ? { ...prev, ...updates } : prev);
    };

    const addLog = (msg: string) => {
        setGenerationTask(prev => {
            if (prev && prev.id === taskId) {
                return { ...prev, logs: [...prev.logs, { message: msg, timestamp: Date.now() }] };
            }
            return prev;
        });
    };

    try {
        // Frontend Simulation Logs (为了视觉效果保留延迟)
        await new Promise(r => setTimeout(r, 800));
        addLog(`> Integrating ${currentReferences.length} context nodes...`);
        updateTask({ progress: 20 });
        
        await new Promise(r => setTimeout(r, 800));
        addLog(`> Retrieving semantic lattice...`);
        updateTask({ progress: 50 });

        await new Promise(r => setTimeout(r, 800));
        addLog(`> Querying generative models (Backend)...`);
        updateTask({ progress: 70 });

        // --- REAL API CALL ---
        const pebble = await pebbleApi.generate(topic, currentReferences);
        
        addLog(`> Constructing artifacts...`);
        updateTask({ progress: 100 });
        // 1. 给用户 1 秒钟的时间看到 "100%" 或完成状态，平滑过渡
        await new Promise(r => setTimeout(r, 1000));

        // 2. 直接执行跳转逻辑 (替代原来的 Toast)
        // a. 将新生成的 Pebble 加入存档
        setArchive(prev => [pebble, ...prev]); 
        
        // b. 设置为当前激活的 Pebble
        setActivePebble(pebble);
        
        // c. 切换视图到 Artifact
        setViewState(ViewState.ARTIFACT);

        // 3. 清理任务状态
        setGenerationTask(null);
        setCurrentReferences([]);

    } catch (error: any) {
        console.error(error);
        addLog(`> ERROR: ${error.message || "Server Error"}`);
        // Keep user in construct view to see error, or timeout to drop
        setTimeout(() => {
             alert("Generation failed. Please try again.");
             setGenerationTask(null);
             setViewState(ViewState.DROP);
        }, 2000);
    }
  };

  const handleTaskClick = () => {
      if (!generationTask) return;
      
      if (generationTask.status === 'completed' && generationTask.result) {
          // Solidify
          const newPebble = generationTask.result;
          setArchive(prev => [newPebble, ...prev]); // Optimistic update
          setActivePebble(newPebble);
          setViewState(ViewState.ARTIFACT);
          
          // Clear task
          setGenerationTask(null);
          setShowCompletionToast(false);
          setCurrentReferences([]); 
      } else {
          setViewState(ViewState.CONSTRUCT);
      }
  };

  // --- 3. CRUD Operations (Connected to Backend) ---

  const handleVerify = async (pebbleId: string) => {
    // Optimistic UI
    setArchive(prev => prev.map(p => 
        p.id === pebbleId ? { ...p, isVerified: true } : p
    ));
    if (activePebble && activePebble.id === pebbleId) {
        setActivePebble(prev => prev ? { ...prev, isVerified: true } : null);
    }
    // API Call
    await pebbleApi.update(pebbleId, { isVerified: true });
  };

  const handleCreateFolder = async (name: string, parentId: string | null, initialPebbleIds: string[]) => {
    const newFolderBase = {
      id: crypto.randomUUID(), // Temporarily generate ID or let backend do it. Using client UUID for optimistic UI.
      name,
      parentId,
      createdAt: Date.now(),
      owner_id: '' // filled by backend
    };
    
    // API Call
    const createdFolder = await folderApi.create(newFolderBase);
    
    // Update State with returned data (to ensure IDs match)
    setFolders(prev => [...prev, createdFolder]);
    
    if (initialPebbleIds.length > 0) {
      setArchive(prev => prev.map(p => 
        initialPebbleIds.includes(p.id) ? { ...p, folderId: createdFolder.id } : p
      ));
      // Update pebbles in backend
      await Promise.all(initialPebbleIds.map(id => 
          pebbleApi.update(id, { folderId: createdFolder.id })
      ));
    }
    return createdFolder.id;
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    // 1. 乐观更新 (Optimistic Update) - 让界面立刻变，不需要等待网络
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    
    // 2. 发送请求到后端保存
    try {
        await folderApi.update(id, { name: newName });
    } catch (error) {
        console.error("Failed to rename folder:", error);
        // 可选：如果失败了，可以在这里回滚名字，或者弹出 Toast 提示
    }
  };

  const handleUngroupFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const targetParentId = folder.parentId;

    // Local Update
    setArchive(prev => prev.map(p => 
        p.folderId === folderId ? { ...p, folderId: targetParentId } : p
    ));
    setFolders(prev => prev.filter(f => f.id !== folderId).map(f => 
        f.parentId === folderId ? { ...f, parentId: targetParentId } : f
    ));

    // Backend: Ideally we need a bulk update API, here iterating for simplicity
    // NOTE: This assumes we delete the folder? The original logic just ungroups.
    // If "Ungroup" implies deleting the folder structure:
    // await api.delete(`/api/folders/${folderId}`); 
  };

  const handleMovePebble = async (pebbleId: string, targetFolderId: string | null) => {
    setArchive(prev => prev.map(p => 
      p.id === pebbleId ? { ...p, folderId: targetFolderId } : p
    ));
    await pebbleApi.update(pebbleId, { folderId: targetFolderId });
  };

  const handleRenamePebble = async (id: string, newTopic: string) => {
    setArchive(prev => prev.map(p => 
      p.id === id ? { ...p, topic: newTopic } : p
    ));
    await pebbleApi.update(id, { topic: newTopic });
  };

  const handleDeletePebbles = async (ids: string[]) => {
    setArchive(prev => prev.map(p => 
      ids.includes(p.id) ? { ...p, isDeleted: true } : p
    ));
    // Parallel API Calls
    await Promise.all(ids.map(id => pebbleApi.delete(id)));
  };

  const handleRestorePebbles = async (ids: string[]) => {
    setArchive(prev => prev.map(p => 
      ids.includes(p.id) ? { ...p, isDeleted: false } : p
    ));
    await Promise.all(ids.map(id => pebbleApi.update(id, { isDeleted: false })));
  };

  // --- Content Updates (Complex Object) ---

  const handleUpdatePebbleContent = async (
      pebbleId: string, 
      level: CognitiveLevel, 
      section: 'main' | 'sidebar', 
      index: number, 
      updatedBlock: MainBlock | SidebarBlock
  ) => {
      // 1. Calculate New State
      let updatedPebbleContent: any = null;

      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const levelContent = p.content[level];
          let newContent = { ...levelContent };

          if (section === 'main') {
              const newBlocks = [...levelContent.mainContent];
              newBlocks[index] = { ...updatedBlock as MainBlock, isUserEdited: true };
              newContent.mainContent = newBlocks;
          } else {
              const newBlocks = [...levelContent.sidebarContent];
              newBlocks[index] = { ...updatedBlock as SidebarBlock, isUserEdited: true };
              newContent.sidebarContent = newBlocks;
          }

          const newPebble = {
              ...p,
              content: {
                  ...p.content,
                  [level]: newContent
              }
          };
          updatedPebbleContent = newPebble.content; // Capture for API
          return newPebble;
      });

      // 2. Optimistic Update
      setArchive(updateFn);
      
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              // Re-apply logic for active pebble state
              const levelContent = prev.content[level];
              let newContent = { ...levelContent };
               if (section === 'main') {
                  const newBlocks = [...levelContent.mainContent];
                  newBlocks[index] = { ...updatedBlock as MainBlock, isUserEdited: true };
                  newContent.mainContent = newBlocks;
              } else {
                  const newBlocks = [...levelContent.sidebarContent];
                  newBlocks[index] = { ...updatedBlock as SidebarBlock, isUserEdited: true };
                  newContent.sidebarContent = newBlocks;
              }
              return { ...prev, content: { ...prev.content, [level]: newContent } };
          });
      }

      // 3. API Call
      if (updatedPebbleContent) {
          await pebbleApi.update(pebbleId, { content: updatedPebbleContent });
      }
  };

  // ★★★ 1. 新增：添加版块逻辑 ★★★
  const handleAddBlock = async (
      pebbleId: string,
      level: CognitiveLevel,
      section: 'main' | 'sidebar',
      index: number,
      type: string
  ) => {
      let updatedContentForApi = null;

      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const levelContent = p.content[level];
          // 创建新块的默认数据
          let newBlock: any = { type, body: "New content...", isUserEdited: true };
          
          // 根据类型初始化特定字段
          if (section === 'main') {
              newBlock.heading = "New Section";
              newBlock.iconType = 'default';
              if (type === 'key_points') newBlock.body = ["Point 1", "Point 2"];
          } else {
              newBlock.heading = "New Item";
              if (type === 'profile') newBlock.emoji = '👤';
              if (type === 'stat') newBlock.emoji = '📊';
          }

          const newBlocks = section === 'main' 
              ? [...levelContent.mainContent] 
              : [...levelContent.sidebarContent];
          
          // 在指定 index 插入
          newBlocks.splice(index, 0, newBlock);

          const newContent = {
              ...levelContent,
              [section === 'main' ? 'mainContent' : 'sidebarContent']: newBlocks
          };

          const newPebble = { ...p, content: { ...p.content, [level]: newContent } };
          updatedContentForApi = newPebble.content;
          return newPebble;
      });

      setArchive(updateFn);
      
      // 同步 ActivePebble
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              const content = updateFn([prev])[0].content[level];
              return { ...prev, content: { ...prev.content, [level]: content } };
          });
      }

      if (updatedContentForApi) await pebbleApi.update(pebbleId, { content: updatedContentForApi });
  };

  // ★★★ 2. 新增：移动版块逻辑 ★★★
  const handleMoveBlock = async (
      pebbleId: string,
      level: CognitiveLevel,
      section: 'main' | 'sidebar',
      fromIndex: number,
      direction: 'up' | 'down'
  ) => {
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      
      // 边界检查在 UI 层做，这里也可以兜底
      if (toIndex < 0) return; 

      let updatedContentForApi = null;

      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const levelContent = p.content[level];
          const blocks = section === 'main' ? [...levelContent.mainContent] : [...levelContent.sidebarContent];
          
          if (toIndex >= blocks.length) return p;

          // 交换位置
          const temp = blocks[fromIndex];
          blocks[fromIndex] = blocks[toIndex];
          blocks[toIndex] = temp;

          const newContent = {
              ...levelContent,
              [section === 'main' ? 'mainContent' : 'sidebarContent']: blocks
          };

          const newPebble = { ...p, content: { ...p.content, [level]: newContent } };
          updatedContentForApi = newPebble.content;
          return newPebble;
      });

      setArchive(updateFn);
      
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              const content = updateFn([prev])[0].content[level];
              return { ...prev, content: { ...prev.content, [level]: content } };
          });
      }

      if (updatedContentForApi) await pebbleApi.update(pebbleId, { content: updatedContentForApi });
  };

  // ★★★ 3. 新增：删除版块逻辑 ★★★
  const handleDeleteBlock = async (
      pebbleId: string,
      level: CognitiveLevel,
      section: 'main' | 'sidebar',
      index: number
  ) => {
      if (!confirm("Are you sure you want to remove this block?")) return;

      let updatedContentForApi = null;

      const updateFn = (prev: PebbleData[]) => prev.map(p => {
          if (p.id !== pebbleId) return p;
          
          const levelContent = p.content[level];
          const blocks = section === 'main' ? [...levelContent.mainContent] : [...levelContent.sidebarContent];
          
          blocks.splice(index, 1); // 删除

          const newContent = {
              ...levelContent,
              [section === 'main' ? 'mainContent' : 'sidebarContent']: blocks
          };

          const newPebble = { ...p, content: { ...p.content, [level]: newContent } };
          updatedContentForApi = newPebble.content;
          return newPebble;
      });

      setArchive(updateFn);
      
      if (activePebble?.id === pebbleId) {
          setActivePebble(prev => {
              if (!prev) return null;
              const content = updateFn([prev])[0].content[level];
              return { ...prev, content: { ...prev.content, [level]: content } };
          });
      }

      if (updatedContentForApi) await pebbleApi.update(pebbleId, { content: updatedContentForApi });
  };

  const handleUpdateEmojiCollage = async (pebbleId: string, level: CognitiveLevel, newEmojis: string[]) => {
     let updatedPebbleContent: any = null;

     const updateFn = (prev: PebbleData[]) => prev.map(p => {
        if(p.id !== pebbleId) return p;
        const newPebble = {
            ...p,
            content: {
                ...p.content,
                [level]: { ...p.content[level], emojiCollage: newEmojis }
            }
        };
        updatedPebbleContent = newPebble.content;
        return newPebble;
     });

     setArchive(updateFn);
     
     if (activePebble?.id === pebbleId) {
         setActivePebble(prev => prev ? {
             ...prev,
             content: {
                 ...prev.content,
                 [level]: { ...prev.content[level], emojiCollage: newEmojis }
             }
         } : null);
     }

     if (updatedPebbleContent) {
        await pebbleApi.update(pebbleId, { content: updatedPebbleContent });
     }
  };

  // --- Navigation ---

  const goToArchive = () => setViewState(ViewState.ARCHIVE);
  const goToDrop = () => {
      setViewState(ViewState.DROP);
      setActivePebble(null);
  };

  const handleSelectFromArchive = (pebble: PebbleData) => {
      setActivePebble(pebble);
      setViewState(ViewState.ARTIFACT);
  };

  // --- Render ---

  if (!isAuthenticated) {
      return <AuthView onLoginSuccess={() => { setIsAuthenticated(true); loadUserData(); }} />;
  }

  if (isLoading) {
      return (
        <div className="h-screen w-full bg-stone-900 flex flex-col items-center justify-center text-stone-500 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <span className="font-display tracking-widest text-xs uppercase">Syncing Neural Core...</span>
        </div>
      );
  }

  return (
    <div className="w-full min-h-screen font-sans flex overflow-hidden bg-stone-50">
      
      {/* Persistent Sidebar */}
      {viewState !== ViewState.ARCHIVE && (
          <ArchiveSidebar 
             archive={archive}
             folders={folders}
             generationTask={generationTask}
             sidebarWidth={sidebarWidth}
             onSetSidebarWidth={handleSetSidebarWidth}
             onSelectPebble={handleSelectFromArchive}
             onSelectTask={handleTaskClick}
             onGoToArchive={goToArchive}
             isImmersionMode={isImmersionMode && viewState === ViewState.DROP}
             onRenamePebble={handleRenamePebble}
             onDeletePebbles={handleDeletePebbles}
             onRestorePebbles={handleRestorePebbles}
             onMovePebble={handleMovePebble}
             onRenameFolder={handleRenameFolder}
             onUngroupFolder={handleUngroupFolder}
          />
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
          
          {viewState === ViewState.DROP && (
            <TheDrop 
                references={currentReferences}
                onSetReferences={setCurrentReferences}
                onConstruct={handleStartConstruct}
                onTypingStateChange={setIsImmersionMode}
                archive={archive}
            />
          )}

          {viewState === ViewState.CONSTRUCT && generationTask && (
            <TheConstruct task={generationTask} />
          )}

          {viewState === ViewState.ARTIFACT && activePebble && (
            <div className="h-screen overflow-y-auto">
                <TheArtifact 
                    pebble={activePebble} 
                    onVerify={handleVerify}
                    onBack={goToDrop}
                    onUpdateContent={handleUpdatePebbleContent}
                    onUpdateEmoji={handleUpdateEmojiCollage}
                    onAddBlock={handleAddBlock} // 新增：添加版块
                    onMoveBlock={handleMoveBlock} // 新增：移动版块
                    onDeleteBlock={handleDeleteBlock} // 新增：删除版块
                />
            </div>
          )}

          {viewState === ViewState.ARCHIVE && (
            <div className="h-screen overflow-y-auto">
                <TheArchive 
                    pebbles={archive}
                    folders={folders}
                    onSelectPebble={handleSelectFromArchive}
                    onBack={goToDrop}
                    onCreateFolder={handleCreateFolder}
                    onMovePebble={handleMovePebble}
                    onRenamePebble={handleRenamePebble}
                    onDeletePebbles={handleDeletePebbles}
                    onRestorePebbles={handleRestorePebbles}
                />
            </div>
          )}
      </main>

      {/* ★★★ 新增：右上角退出按钮 ★★★ */}
      {/* 只在已登录状态下显示 */}
      {isAuthenticated && viewState !== ViewState.ARCHIVE && (
        <button 
          onClick={handleLogout}
          className="fixed top-6 right-6 z-50 p-2.5 bg-white/80 backdrop-blur border border-stone-200 rounded-full text-stone-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm hover:shadow-md group"
          title="Log Out"
        >
           <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Completion Toast */}
      {showCompletionToast && generationTask?.result && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-stone-900 text-stone-50 px-6 py-3 rounded-full shadow-2xl z-50 animate-[slideInUp_0.3s_ease-out] flex items-center gap-4">
            <CheckCircle2 className="text-green-400" size={20} />
            <span className="font-medium text-sm">
                "{generationTask.result.topic}" is ready.
            </span>
            <button 
               onClick={handleTaskClick}
               className="bg-stone-700 hover:bg-stone-600 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
            >
               View <ArrowRight size={12} />
            </button>
        </div>
      )}
    </div>
  );
};

export default App;