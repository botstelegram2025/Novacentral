import { useEffect, useState } from "react";
import { UserPanelLayout } from "./UserDashboard";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Bell, Trash2 } from "lucide-react";

export default function UserNotifications() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/users/me/notifications").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);
  const markRead = async (id) => { await api.post(`/users/me/notifications/${id}/read`); load(); };
  const del = async (id) => { await api.delete(`/users/me/notifications/${id}`); load(); };

  return (
    <UserPanelLayout>
      <h1 className="heading text-2xl font-bold mb-6">Notificações</h1>
      {items.length === 0 ? <div className="card-elev p-10 text-center text-zinc-500"><Bell className="w-8 h-8 mx-auto mb-2" />Sem notificações.</div> :
        <div className="space-y-2">
          {items.map(n => (
            <Card key={n.id} className={`card-elev ${!n.read ? "border-blue-500/30" : ""}`} data-testid={`notif-${n.id}`}>
              <CardContent className="p-4 flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold">{n.title}</div>
                    {!n.read && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[9px]">Nova</Badge>}
                  </div>
                  <div className="text-sm text-zinc-400">{n.message}</div>
                  <div className="text-xs text-zinc-500 mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <div className="flex gap-1">
                  {!n.read && <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Lida</Button>}
                  <Button size="icon" variant="ghost" onClick={() => del(n.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>}
    </UserPanelLayout>
  );
}
