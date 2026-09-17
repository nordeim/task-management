"use client";

import { useState } from "react";
import {
  MessageSquare,
  Briefcase,
  Code,
  Layers,
  ShoppingCart,
  Users,
  Zap,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface IntegrationsDialogProps {
  onClose: () => void;
  boardTitle: string;
}

interface Integration {
  name: string;
  category: string;
  description: string;
  icon: typeof MessageSquare;
  /** Reference tile background (brand-ish hex from the live probe). */
  color: string;
}

/**
 * Reference probe (2026-09-18): the eight integrations with their tile
 * colors and lucide icons, exactly as rendered by the reference's
 * Integrations Center.
 */
const INTEGRATIONS: Integration[] = [
  {
    name: "Slack",
    category: "Communication",
    description: "Get real-time updates and notifications in your Slack channels.",
    icon: MessageSquare,
    color: "#4A154B",
  },
  {
    name: "Google Drive",
    category: "File Management",
    description: "Attach files from Google Drive directly to your tasks.",
    icon: Briefcase,
    color: "#4285F4",
  },
  {
    name: "GitHub",
    category: "Development",
    description: "Link pull requests and issues to tasks for seamless tracking.",
    icon: Code,
    color: "#181717",
  },
  {
    name: "Figma",
    category: "Design",
    description: "Embed Figma files and prototypes within your board.",
    icon: Layers,
    color: "#F24E1E",
  },
  {
    name: "Zoom",
    category: "Communication",
    description: "Schedule and join Zoom meetings directly from tasks.",
    icon: MessageSquare,
    color: "#2D8CFF",
  },
  {
    name: "Jira",
    category: "Development",
    description: "Sync issues between Jira and your board for unified project management.",
    icon: Briefcase,
    color: "#0052CC",
  },
  {
    name: "Shopify",
    category: "E-commerce",
    description: "Track orders and customer data from your Shopify store.",
    icon: ShoppingCart,
    color: "#7AB55C",
  },
  {
    name: "HubSpot",
    category: "CRM",
    description: "Sync contacts and deals between HubSpot and your board.",
    icon: Users,
    color: "#FF7A59",
  },
];

/**
 * Integrations Center modal — decompiled from the reference and
 * live-probed 2026-09-18. Opened from the board header's Integrate
 * button: sticky header, blue Zap banner, and an 8-card grid. The
 * reference's switches are LOCAL-STATE-ONLY (verified: toggling then
 * reloading shows them unchecked again) and its Configure buttons are
 * inert mocks — mirrored here deliberately.
 */
export function IntegrationsDialog({ onClose, boardTitle }: IntegrationsDialogProps) {
  // Component-local switch state — the parent conditionally mounts this
  // dialog (reference: `X && <IntegrationsCenter/>`), so closing unmounts
  // it and every switch resets, exactly like the live reference
  // (verified: toggle → close → reopen shows unchecked).
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl sm:max-w-4xl"
      >
        <DialogTitle className="sr-only">Integrations Center — {boardTitle}</DialogTitle>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Integrations Center</h2>
            <p className="text-gray-600">Connect your favorite tools to {boardTitle}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Close integrations"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-xl font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ×
          </Button>
        </div>
        <div className="p-6">
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Zap className="h-6 w-6 text-blue-600" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-blue-800">Supercharge Your Workflow</h3>
              <p className="text-sm text-blue-700">
                Integrate with other apps to automate tasks, sync data, and streamline your
                processes.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card
                  key={integration.name}
                  className="border-[#E1E5F3] shadow transition-shadow duration-200 hover:shadow-lg"
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: integration.color }}
                        aria-hidden="true"
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </span>
                      <div>
                        <CardTitle className="text-base font-bold tracking-tight text-[#323338]">
                          {integration.name}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1 px-2.5 font-semibold">
                          {integration.category}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={enabled[integration.name] ?? false}
                      onCheckedChange={(next) =>
                        setEnabled((current) => ({ ...current, [integration.name]: next }))
                      }
                      aria-label={`Enable ${integration.name} integration`}
                      className="h-5 w-9 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200"
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-sm text-[#676879]">{integration.description}</p>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 rounded-md px-3 text-xs text-[#0073EA] hover:bg-[#0073EA]/10"
                      >
                        <Settings className="mr-1 h-3 w-3" aria-hidden="true" /> Configure
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
