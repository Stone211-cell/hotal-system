"use client";

import { useEffect, useState } from "react";
import { getRoomTypes, createRoomType, updateRoomType, deleteRoomType, RoomType, CreateRoomTypeInput } from "@/services/roomService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DoorOpen, Plus, Trash2, Edit2, Info } from "lucide-react";
import { toast } from "sonner";

export default function RoomTypesPage() {
  const [types, setTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");

  const fetchData = async () => {
    try {
      const data = await getRoomTypes();
      setTypes(data);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถดึงข้อมูลหมวดหมู่ห้องพักได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingType(null);
    setName("");
    setDescription("");
    setBasePrice("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (t: RoomType) => {
    setEditingType(t);
    setName(t.name);
    setDescription(t.description || "");
    setBasePrice(t.basePrice.toString());
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !basePrice) {
      toast.error("กรุณากรอกชื่อหมวดหมู่และราคาพื้นฐาน");
      return;
    }

    try {
      const payload: CreateRoomTypeInput = {
        name,
        description,
        basePrice: Number(basePrice)
      };

      if (editingType) {
        await updateRoomType(editingType.id, payload);
        toast.success("อัปเดตหมวดหมู่เรียบร้อยแล้ว");
      } else {
        await createRoomType(payload);
        toast.success("สร้างหมวดหมู่ใหม่เรียบร้อยแล้ว");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบหมวดหมู่นี้หรือไม่? คุณจะไม่สามารถลบได้หากยังมีห้องพักในหมวดหมู่นี้อยู่")) return;
    try {
      await deleteRoomType(id);
      toast.success("ลบหมวดหมู่เรียบร้อยแล้ว");
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "ไม่สามารถลบหมวดหมู่นี้ได้");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">หมวดหมู่ห้องพัก</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            จัดการประเภทห้องพักของคุณ (เช่น ห้องแอร์, พัดลม, 2 เตียง) เพื่อนำไปใช้เวลาสร้างห้อง
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="rounded-xl h-10 shadow-md">
          <Plus className="mr-2 h-4 w-4" /> สร้างหมวดหมู่ใหม่
        </Button>
      </div>

      {types.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl">
          <DoorOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">ยังไม่มีหมวดหมู่ห้องพัก</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            สร้างหมวดหมู่ห้องพักเช่น "ห้องแอร์ เตียงเดี่ยว" หรือ "ห้อง VIP" เพื่อให้ง่ายต่อการแบ่งประเภทห้องพักของคุณ
          </p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-4 rounded-xl">
            เริ่มต้นสร้างหมวดหมู่แรก
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((type) => (
            <Card key={type.id} className="hover:shadow-md transition-all group overflow-hidden border-border/40">
              <div className="h-1.5 w-full bg-violet-500/20 group-hover:bg-violet-500 transition-colors" />
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{type.name}</h3>
                    <p className="text-xl font-bold text-violet-600 mt-1">
                      ฿{type.basePrice.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">/ คืน</span>
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-100">
                    {type._count?.rooms || 0} ห้อง
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4">
                  {type.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                </p>

                <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                  <Button onClick={() => handleOpenEdit(type)} variant="outline" size="sm" className="flex-1 rounded-lg">
                    <Edit2 className="h-3.5 w-3.5 mr-2" /> แก้ไข
                  </Button>
                  <Button 
                    onClick={() => handleDelete(type.id)} 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? "แก้ไขหมวดหมู่ห้องพัก" : "สร้างหมวดหมู่ใหม่"}</DialogTitle>
            <DialogDescription>
              ตั้งชื่อหมวดหมู่และราคาเริ่มต้น เพื่อนำไปใช้เวลาสร้างห้องพักใหม่ในระบบ
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">ชื่อหมวดหมู่ *</Label>
              <Input 
                id="type-name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="เช่น ห้องพัดลม, ห้องแอร์เตียงคู่" 
                required 
                className="rounded-xl h-10" 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-price">ราคาพื้นฐาน / คืน (บาท) *</Label>
              <Input 
                id="type-price" 
                type="number" 
                step="any"
                value={basePrice} 
                onChange={(e) => setBasePrice(e.target.value)} 
                required 
                className="rounded-xl h-10" 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-desc">รายละเอียดเพิ่มเติม</Label>
              <Textarea 
                id="type-desc" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="เช่น มีแอร์ ทีวี ตู้เย็น ฟรี Wifi" 
                className="rounded-xl resize-none h-24" 
              />
            </div>
            
            <div className="pt-2 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-xl h-10">
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1 rounded-xl h-10">
                บันทึกข้อมูล
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
