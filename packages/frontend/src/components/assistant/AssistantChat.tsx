import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  X,
  ChevronDown,
  Calendar,
  CheckSquare,
  Package,
  Activity,
  Stethoscope,
  BarChart2,
  Utensils,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { queryAssistant, getQuickActions } from "@/services/assistantService";
import type {
  AssistantResponse,
  AssistantMessage,
  ScheduleData,
  HorsesData,
  InventoryData,
  InvoicesData,
  AnalyticsData,
  RecommendationsData,
} from "@stall-bokning/shared";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: AssistantResponse["data"];
  suggestions?: AssistantResponse["suggestions"];
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  query: string;
  category: string;
}

interface AssistantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: Calendar,
  "check-square": CheckSquare,
  package: Package,
  activity: Activity,
  stethoscope: Stethoscope,
  "bar-chart": BarChart2,
  utensils: Utensils,
  "file-text": FileText,
};

export function AssistantChat({ open, onOpenChange }: AssistantChatProps) {
  const { t, i18n } = useTranslation(["assistant", "common"]);
  const { currentOrganizationId } = useOrganizationContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const language = (i18n.language === "sv" ? "sv" : "en") as "sv" | "en";

  // Load quick actions
  useEffect(() => {
    if (currentOrganizationId && open) {
      getQuickActions(currentOrganizationId, language)
        .then((response) => setQuickActions(response.quickActions))
        .catch(console.error);
    }
  }, [currentOrganizationId, open, language]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = async (queryText?: string) => {
    const query = queryText || input.trim();
    if (!query || !currentOrganizationId || loading) return;

    setInput("");
    setShowQuickActions(false);

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);

    try {
      const response = await queryAssistant(currentOrganizationId, {
        query,
        conversationId: conversationId || undefined,
        language,
      });

      setConversationId(response.conversationId);

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        data: response.data,
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Assistant query failed:", error);

      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: t(
          "assistant:error",
          "Sorry, something went wrong. Please try again.",
        ),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.query);
  };

  const handleSuggestion = (suggestion: { query: string }) => {
    handleSend(suggestion.query);
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setShowQuickActions(true);
    inputRef.current?.focus();
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[400px] max-w-[calc(100vw-32px)] shadow-2xl rounded-xl overflow-hidden border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">
            {t("assistant:title", "Stallbokning Assistant")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 px-2"
              onClick={startNewConversation}
            >
              {t("assistant:newChat", "New")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="h-[400px] p-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Sparkles className="h-12 w-12 mx-auto text-primary/30 mb-3" />
              <h3 className="font-medium text-lg">
                {t("assistant:welcome", "Hi! How can I help you?")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  "assistant:welcomeDescription",
                  "Ask me about your schedule, horses, inventory, and more.",
                )}
              </p>
            </div>

            {/* Quick actions */}
            {showQuickActions && quickActions.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto py-2"
                  >
                    <span className="text-sm font-medium">
                      {t("assistant:quickActions", "Quick Actions")}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {quickActions.slice(0, 6).map((action) => {
                      const Icon = ICON_MAP[action.icon] || MessageSquare;
                      return (
                        <Button
                          key={action.id}
                          variant="outline"
                          className="h-auto py-2 px-3 justify-start text-left"
                          onClick={() => handleQuickAction(action)}
                        >
                          <Icon className="h-4 w-4 mr-2 shrink-0" />
                          <span className="text-xs truncate">
                            {action.label}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>

                  {/* Data visualization */}
                  {message.data && (
                    <div className="mt-3">
                      <AssistantDataDisplay data={message.data} />
                    </div>
                  )}

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="secondary"
                          size="sm"
                          className="h-auto py-1 px-2 text-xs"
                          onClick={() => handleSuggestion(suggestion)}
                        >
                          {suggestion.text}
                        </Button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("assistant:placeholder", "Ask me anything...")}
            disabled={loading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Data display component for different response types
function AssistantDataDisplay({ data }: { data: AssistantResponse["data"] }) {
  if (!data) return null;

  switch (data.type) {
    case "schedule":
      return <ScheduleDisplay data={data as ScheduleData} />;
    case "horses":
      return <HorsesDisplay data={data as HorsesData} />;
    case "inventory":
      return <InventoryDisplay data={data as InventoryData} />;
    case "invoices":
      return <InvoicesDisplay data={data as InvoicesData} />;
    case "analytics":
      return <AnalyticsDisplay data={data as AnalyticsData} />;
    case "recommendations":
      return <RecommendationsDisplay data={data as RecommendationsData} />;
    default:
      return null;
  }
}

function ScheduleDisplay({ data }: { data: ScheduleData }) {
  const { t } = useTranslation("assistant");

  if (!data.items.length) {
    return (
      <p className="text-xs text-muted-foreground">{t("data.noActivities")}</p>
    );
  }

  return (
    <Card className="bg-background/50">
      <CardContent className="p-2 space-y-1">
        {data.items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs py-1 border-b last:border-0"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{item.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{item.date}</span>
              <Badge variant="outline" className="text-[10px] h-4">
                {item.status}
              </Badge>
            </div>
          </div>
        ))}
        {data.items.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            {t("data.more", { count: data.items.length - 5 })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function HorsesDisplay({ data }: { data: HorsesData }) {
  const { t } = useTranslation("assistant");

  if (!data.items.length) {
    return (
      <p className="text-xs text-muted-foreground">{t("data.noHorses")}</p>
    );
  }

  return (
    <Card className="bg-background/50">
      <CardContent className="p-2 space-y-1">
        {data.items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs py-1 border-b last:border-0"
          >
            <div>
              <span className="font-medium">{item.name}</span>
              {item.breed && (
                <span className="text-muted-foreground ml-2">
                  ({item.breed})
                </span>
              )}
            </div>
            <Badge
              variant={item.status === "active" ? "default" : "secondary"}
              className="text-[10px] h-4"
            >
              {item.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InventoryDisplay({ data }: { data: InventoryData }) {
  const { t } = useTranslation("assistant");

  if (!data.items.length) {
    return <p className="text-xs text-muted-foreground">{t("data.noItems")}</p>;
  }

  return (
    <Card className="bg-background/50">
      <CardContent className="p-2 space-y-1">
        {data.items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs py-1 border-b last:border-0"
          >
            <div className="flex items-center gap-2">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {item.quantity} {item.unit}
              </span>
              {item.lowStockAlert && (
                <Badge variant="destructive" className="text-[10px] h-4">
                  {t("status.lowStock")}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InvoicesDisplay({ data }: { data: InvoicesData }) {
  const { t } = useTranslation("assistant");

  if (!data.items.length) {
    return (
      <p className="text-xs text-muted-foreground">{t("data.noInvoices")}</p>
    );
  }

  return (
    <Card className="bg-background/50">
      <CardContent className="p-2 space-y-1">
        {data.items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs py-1 border-b last:border-0"
          >
            <div>
              <span className="font-medium">{item.invoiceNumber}</span>
              <span className="text-muted-foreground ml-2">
                {item.contactName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {item.total} {item.currency}
              </span>
              <Badge
                variant={item.status === "paid" ? "default" : "secondary"}
                className="text-[10px] h-4"
              >
                {item.status}
              </Badge>
            </div>
          </div>
        ))}
        {data.totalAmount !== undefined && (
          <div className="text-xs font-medium pt-2 text-right">
            {t("data.total")}: {data.totalAmount} SEK
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsDisplay({ data }: { data: AnalyticsData }) {
  return (
    <Card className="bg-background/50">
      <CardContent className="p-2 grid grid-cols-2 gap-2">
        {data.metrics.map((metric, index) => (
          <div key={index} className="text-center p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold">{metric.value}</p>
            <p className="text-[10px] text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecommendationsDisplay({ data }: { data: RecommendationsData }) {
  const { t } = useTranslation("assistant");

  if (!data.items.length) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("data.noRecommendations")}
      </p>
    );
  }

  return (
    <Card className="bg-background/50">
      <CardContent className="p-2 space-y-2">
        {data.items.map((item, index) => (
          <div key={index} className="p-2 bg-muted/30 rounded">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{item.title}</span>
              <Badge
                variant={
                  item.priority === "high"
                    ? "destructive"
                    : item.priority === "medium"
                      ? "default"
                      : "secondary"
                }
                className="text-[10px] h-4"
              >
                {item.priority}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {item.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default AssistantChat;
