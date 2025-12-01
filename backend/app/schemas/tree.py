from typing import List, Optional, Dict
from pydantic import BaseModel

class TreeNode(BaseModel):
    id: str
    name: str
    children: Optional[List['TreeNode']] = None

class TreeResponse(BaseModel):
    tree: TreeNode
    status: str
