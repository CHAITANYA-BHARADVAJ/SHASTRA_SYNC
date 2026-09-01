"""
WebSocket connection manager for the Hub.

Keeps track of every connected client (Next.js Family Dashboard and the
Flutter Elder App) and broadcasts JSON payloads to all of them.

Clients inspect the `type` field of each payload to decide whether the
message is meant for them (AgentDecision vs FamilyAlert).
"""
from __future__ import annotations

import asyncio
from typing import List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, payload: dict) -> None:
        """Send a JSON payload to every connected client.

        Dead connections are pruned so a single broken socket does not
        break the broadcast for everyone else.
        """
        stale: List[WebSocket] = []

        # Snapshot the list so we can iterate safely.
        async with self._lock:
            connections = list(self.active_connections)

        for connection in connections:
            try:
                await connection.send_json(payload)
            except Exception:
                stale.append(connection)

        if stale:
            async with self._lock:
                for connection in stale:
                    if connection in self.active_connections:
                        self.active_connections.remove(connection)

    @property
    def count(self) -> int:
        return len(self.active_connections)


# Single shared instance used across the app.
manager = ConnectionManager()
