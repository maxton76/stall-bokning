import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { EquipmentItem } from "@stall-bokning/shared";

interface EquipmentListEditorProps {
  value: EquipmentItem[];
  onChange: (items: EquipmentItem[]) => void;
}

export function EquipmentListEditor({
  value,
  onChange,
}: EquipmentListEditorProps) {
  const addItem = () => {
    const newItem: EquipmentItem = {
      id: crypto.randomUUID(),
      name: "",
      location: "",
      notes: "",
    };
    onChange([...value, newItem]);
  };

  const removeItem = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof EquipmentItem,
    newValue: string,
  ) => {
    onChange(
      value.map((item) =>
        item.id === id ? { ...item, [field]: newValue } : item,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Equipment</Label>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No equipment added. Click below to add equipment items.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((item) => (
            <div
              key={item.id}
              className="flex gap-2 items-start p-2 border rounded-md bg-muted/30"
            >
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Equipment name (e.g., Boots, Blanket)"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                  className="h-8"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Location (e.g., Tack room hook 3)"
                    value={item.location || ""}
                    onChange={(e) =>
                      updateItem(item.id, "location", e.target.value)
                    }
                    className="h-8 flex-1"
                  />
                  <Input
                    placeholder="Notes (optional)"
                    value={item.notes || ""}
                    onChange={(e) =>
                      updateItem(item.id, "notes", e.target.value)
                    }
                    className="h-8 flex-1"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Equipment
      </Button>
    </div>
  );
}
