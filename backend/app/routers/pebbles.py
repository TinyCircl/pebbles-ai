from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models import Pebble, Folder
from app.database import pebbles_collection, folders_collection
from app.routers.auth import get_current_user

router = APIRouter()

# --- Pebbles Endpoints ---

@router.get("/pebbles", response_model=List[Pebble])
async def get_pebbles(current_user: dict = Depends(get_current_user)):
    cursor = pebbles_collection.find({"owner_id": current_user["username"], "isDeleted": False})
    pebbles = await cursor.to_list(length=1000)
    return pebbles

@router.post("/pebbles", response_model=Pebble)
async def create_pebble(pebble: Pebble, current_user: dict = Depends(get_current_user)):
    pebble.owner_id = current_user["username"]
    await pebbles_collection.insert_one(pebble.dict())
    return pebble

@router.put("/pebbles/{pebble_id}")
async def update_pebble(pebble_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    print(f"Update Request for {pebble_id}: {update_data.keys()}") # ★ Debug Log
    
    result = await pebbles_collection.update_one(
        {"id": pebble_id, "owner_id": current_user["username"]},
        {"$set": update_data}
    )
    
    print(f"Matched: {result.matched_count}, Modified: {result.modified_count}") # ★ Debug Log
    
    if result.matched_count == 0:
        # 如果匹配数为0，说明 ID 不对或者 Owner 不对
        print("Update Failed: Document not found or permission denied.")
        raise HTTPException(status_code=404, detail="Pebble not found")
        
    return {"status": "success"}

@router.delete("/pebbles/{pebble_id}")
async def delete_pebble(pebble_id: str, current_user: dict = Depends(get_current_user)):
    # 软删除
    await pebbles_collection.update_one(
        {"id": pebble_id, "owner_id": current_user["username"]},
        {"$set": {"isDeleted": True}}
    )
    return {"status": "deleted"}

# --- Folders Endpoints ---

@router.get("/folders", response_model=List[Folder])
async def get_folders(current_user: dict = Depends(get_current_user)):
    cursor = folders_collection.find({"owner_id": current_user["username"]})
    return await cursor.to_list(length=1000)

@router.post("/folders", response_model=Folder)
async def create_folder(folder: Folder, current_user: dict = Depends(get_current_user)):
    folder.owner_id = current_user["username"]
    await folders_collection.insert_one(folder.dict())
    return folder

# ★★★ 新增：更新文件夹接口 ★★★
@router.put("/folders/{folder_id}")
async def update_folder(folder_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    # 同样只允许修改属于当前用户的文件夹
    result = await folders_collection.update_one(
        {"id": folder_id, "owner_id": current_user["username"]},
        {"$set": update_data}
    )
    # 即使没有修改行数(名字一样)也返回成功
    return {"status": "success", "id": folder_id}

@router.post("/folders/{folder_id}/ungroup")
async def ungroup_folder_endpoint(folder_id: str, current_user: dict = Depends(get_current_user)):
    # 1. 获取当前文件夹信息（为了知道它的 parentId 是什么）
    folder = await folders_collection.find_one({"id": folder_id, "owner_id": current_user["username"]})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    target_parent_id = folder.get("parentId")

    # 2. 将该文件夹下的所有 Pebble 移动到上一级
    await pebbles_collection.update_many(
        {"folderId": folder_id, "owner_id": current_user["username"]},
        {"$set": {"folderId": target_parent_id}}
    )

    # 3. 将该文件夹下的所有 子文件夹 移动到上一级
    await folders_collection.update_many(
        {"parentId": folder_id, "owner_id": current_user["username"]},
        {"$set": {"parentId": target_parent_id}}
    )

    # 4. 删除空文件夹
    await folders_collection.delete_one({"id": folder_id})

    return {"status": "ungrouped", "moved_to": target_parent_id}