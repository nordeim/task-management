"use client";

import { useState } from "react";
import {
  Bell,
  Clock,
  Users,
  TriangleAlert,
  CircleCheckBig,
  Zap,
  Plus,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface AutomationsDialogProps {
  onClose: () => void;
  boardTitle: string;
}

interface Recipe {
  name: string;
  category: string;
  description: string;
  icon: typeof Bell;
  /** Reference tile background class (bg-{color}-500 probed live). */
  tileClass: string;
}

/**
 * Reference probe (2026-09-18): the five automation recipes with their
 * tiles, categories, and descriptions, exactly as rendered by the
 * reference's Automations Center.
 */
const RECIPES: Recipe[] = [
  {
    name: "Notify on Status Change",
    category: "Notifications",
    description: 'When a task status changes to "Done", notify the project manager.',
    icon: Bell,
    tileClass: "bg-blue-500",
  },
  {
    name: "Due Date Reminder",
    category: "Reminders",
    description: "24 hours before a task is due, send a reminder to the assignee.",
    icon: Clock,
    tileClass: "bg-yellow-500",
  },
  {
    name: "Assign New Item",
    category: "Assignments",
    description: "When a new item is created, assign it to the team lead.",
    icon: Users,
    tileClass: "bg-green-500",
  },
  {
    name: "Priority Escalation",
    category: "Workflow",
    description: 'If a "High Priority" task is overdue by 2 days, change its status to "Critical".',
    icon: TriangleAlert,
    tileClass: "bg-red-500",
  },
  {
    name: "Subitem Completion Update",
    category: "Workflow",
    description: 'When all subitems of a task are "Done", update parent task status to "Review".',
    icon: CircleCheckBig,
    tileClass: "bg-purple-500",
  },
];

/**
 * Automations Center modal — decompiled from the reference and
 * live-probed 2026-09-18. Opened from the board header's Automate
 * button: sticky header, purple Zap banner, a "Create Custom
 * Automation" button, and a 5-recipe grid with switches. The
 * reference's switches are LOCAL-STATE-ONLY and its Create/Customize
 * buttons are inert mocks (verified: no toast, no dialog) — mirrored
 * here deliberately.
 */
export function AutomationsDialog({ onClose, boardTitle }: AutomationsDialogProps) {
  // Component-local switch state — the parent conditionally mounts this
  // dialog, so closing unmounts it and every switch resets (reference-
  // verified behavior).
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl sm:max-w-4xl"
      >
        <DialogTitle className="sr-only">Automations Center — {boardTitle}</DialogTitle>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Automations Center</h2>
            <p className="text-gray-600">Automate repetitive tasks for {boardTitle}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Close automations"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-xl font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ×
          </Button>
        </div>
        <div className="p-6">
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <Zap className="h-6 w-6 text-purple-600" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-purple-800">Work Smarter, Not Harder</h3>
              <p className="text-sm text-purple-700">
                Set up automated rules to save time and keep your board updated effortlessly.
              </p>
            </div>
          </div>
          <div className="mb-6">
            <Button
              type="button"
              className="h-9 bg-[#0073EA] px-4 py-2 text-white shadow hover:bg-[#0056B3]"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Create Custom Automation
            </Button>
          </div>
          <h3 className="mb-4 text-lg font-semibold text-gray-700">Popular Automation Recipes</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {RECIPES.map((recipe) => {
              const Icon = recipe.icon;
              return (
                <Card
                  key={recipe.name}
                  className="border-[#E1E5F3] shadow transition-shadow duration-200 hover:shadow-lg"
                >
                  <CardHeader className="flex flex-col pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${recipe.tileClass}`}
                          aria-hidden="true"
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </span>
                        <div>
                          <CardTitle className="text-base font-bold tracking-tight text-[#323338]">
                            {recipe.name}
                          </CardTitle>
                          <Badge variant="outline" className="mt-1 px-2.5 font-semibold">
                            {recipe.category}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={enabled[recipe.name] ?? false}
                        onCheckedChange={(next) =>
                          setEnabled((current) => ({ ...current, [recipe.name]: next }))
                        }
                        aria-label={`Enable ${recipe.name} recipe`}
                        className="h-5 w-9 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-sm text-[#676879]">{recipe.description}</p>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 rounded-md px-3 text-xs text-[#0073EA] hover:bg-[#0073EA]/10"
                      >
                        <Settings className="mr-1 h-3 w-3" aria-hidden="true" /> Customize
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
