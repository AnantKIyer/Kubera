"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import {
  ColorPicker,
  FormBody,
  FormError,
  FormField,
  FormFooter,
  FormSection,
  IconPicker,
  Input,
  PreviewBadge,
} from "@/components/ui/form";
import {
  COLOR_OPTIONS,
  ICON_OPTIONS,
  getCategoryIcon,
} from "@/lib/icons";

const FORM_ID = "category-form";

interface EditingCategory {
  _id: Id<"categories">;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
}

export default function CategoriesPage() {
  const categories = useQuery(api.categories.list, {});
  const create = useMutation(api.categories.create);
  const update = useMutation(api.categories.update);
  const remove = useMutation(api.categories.remove);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingCategory | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState(COLOR_OPTIONS[1]);
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const income = (categories ?? []).filter((c) => c.type === "income");
    const expense = (categories ?? []).filter((c) => c.type === "expense");
    return { income, expense };
  }, [categories]);

  const openNew = (t: "income" | "expense") => {
    setEditing(null);
    setName("");
    setType(t);
    setColor(COLOR_OPTIONS[1]);
    setIcon(ICON_OPTIONS[0]);
    setError(null);
    setOpen(true);
  };

  const openEdit = (c: EditingCategory) => {
    setEditing(c);
    setName(c.name);
    setType(c.type);
    setColor(c.color);
    setIcon(c.icon);
    setError(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await update({ id: editing._id, name, color, icon });
      } else {
        await create({ name, type, color, icon });
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize your income and expenses with custom categories."
      />

      {!categories ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CategoryColumn
            title="Income"
            accent="hsl(var(--income))"
            items={grouped.income}
            onAdd={() => openNew("income")}
            onEdit={openEdit}
            onRemove={(id) => {
              if (confirm("Delete this category? Linked transactions are kept but uncategorized."))
                remove({ id });
            }}
          />
          <CategoryColumn
            title="Expense"
            accent="hsl(var(--expense))"
            items={grouped.expense}
            onAdd={() => openNew("expense")}
            onEdit={openEdit}
            onRemove={(id) => {
              if (confirm("Delete this category? Linked transactions are kept but uncategorized."))
                remove({ id });
            }}
          />
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit category" : "New category"}
        description={editing ? undefined : `Create a ${type} category`}
        size="lg"
        footer={
          <FormFooter
            formId={FORM_ID}
            onCancel={() => setOpen(false)}
            submitLabel={editing ? "Save changes" : "Create category"}
          />
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <FormBody>
            <PreviewBadge
              icon={getCategoryIcon(icon)}
              color={color}
              title={name || "Category name"}
              subtitle={type}
            />

            <FormField label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Coffee, Salary, SIP…"
                required
                autoFocus
              />
            </FormField>

            <FormSection title="Appearance">
              <FormField label="Color">
                <ColorPicker value={color} onChange={setColor} colors={COLOR_OPTIONS} />
              </FormField>
              <FormField label="Icon">
                <IconPicker
                  value={icon}
                  onChange={setIcon}
                  icons={ICON_OPTIONS}
                  getIcon={getCategoryIcon}
                />
              </FormField>
            </FormSection>

            {error && <FormError message={error} />}
          </FormBody>
        </form>
      </Modal>
    </>
  );
}

function CategoryColumn({
  title,
  accent,
  items,
  onAdd,
  onEdit,
  onRemove,
}: {
  title: string;
  accent: string;
  items: {
    _id: Id<"categories">;
    name: string;
    type: "income" | "expense";
    color: string;
    icon: string;
  }[];
  onAdd: () => void;
  onEdit: (c: EditingCategory) => void;
  onRemove: (id: Id<"categories">) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          {title}
          <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={onAdd}>
          <Plus size={15} /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={<Tags size={20} />} title="No categories yet" />
        ) : (
          <div className="space-y-1">
            {items.map((c) => {
              const Icon = getCategoryIcon(c.icon);
              return (
                <div
                  key={c._id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${c.color}24`, color: c.color }}
                  >
                    <Icon size={17} />
                  </div>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => onEdit(c)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onRemove(c._id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
