import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  MessageSquare,
  Plus,
  Send,
  ChevronLeft,
  Mail,
  MailOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  getPortalThreads,
  getPortalThreadMessages,
  createPortalThread,
  sendPortalMessage,
  type PortalThreadsResponse,
  type PortalMessagesResponse,
} from "@/services/portalService";
import type { PortalThread, PortalMessage } from "@stall-bokning/shared";
import { cn, toDate } from "@/lib/utils";

export default function PortalMessagesPage() {
  const { t, i18n } = useTranslation(["portal", "common"]);
  const { toast } = useToast();
  const locale = i18n.language === "sv" ? sv : enUS;

  const [selectedThread, setSelectedThread] = useState<PortalThread | null>(
    null,
  );
  const [newThreadDialogOpen, setNewThreadDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const threads = useAsyncData<PortalThreadsResponse>({
    loadFn: getPortalThreads,
  });

  const messages = useAsyncData<PortalMessagesResponse>({
    loadFn: async () => {
      if (!selectedThread) throw new Error("No thread selected");
      return getPortalThreadMessages(selectedThread.id);
    },
  });

  useEffect(() => {
    threads.load();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      messages.load();
    }
  }, [selectedThread?.id]);

  useEffect(() => {
    // Scroll to bottom when messages load
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.messages]);

  const handleCreateThread = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;

    setSending(true);
    try {
      const thread = await createPortalThread({
        subject: newSubject,
        initialMessage: newMessage,
      });
      setNewThreadDialogOpen(false);
      setNewSubject("");
      setNewMessage("");
      await threads.load();
      setSelectedThread(thread);
      toast({ title: t("portal:messages.threadCreated") });
    } catch {
      toast({
        title: t("common:errors.generic"),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyMessage.trim()) return;

    setSending(true);
    try {
      await sendPortalMessage(selectedThread.id, replyMessage);
      setReplyMessage("");
      await messages.load();
      await threads.load();
    } catch {
      toast({
        title: t("common:errors.generic"),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("portal:messages.title")}</h1>
          <p className="text-muted-foreground">
            {t("portal:messages.description")}
          </p>
        </div>
        <Dialog
          open={newThreadDialogOpen}
          onOpenChange={setNewThreadDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("portal:messages.newMessage")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("portal:messages.newMessage")}</DialogTitle>
              <DialogDescription>
                {t("portal:messages.newMessageDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {t("portal:messages.subject")}
                </label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder={t("portal:messages.subjectPlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("portal:messages.message")}
                </label>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("portal:messages.messagePlaceholder")}
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setNewThreadDialogOpen(false)}
              >
                {t("common:buttons.cancel")}
              </Button>
              <Button
                onClick={handleCreateThread}
                disabled={sending || !newSubject.trim() || !newMessage.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                {t("common:buttons.send")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Thread List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("portal:messages.conversations")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {threads.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : threads.data?.threads.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 p-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("portal:messages.noMessages")}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {threads.data?.threads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                        selectedThread?.id === thread.id && "bg-muted",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {thread.unreadCount > 0 ? (
                          <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        ) : (
                          <MailOpen className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "font-medium truncate",
                                thread.unreadCount > 0 && "text-primary",
                              )}
                            >
                              {thread.subject}
                            </p>
                            {thread.unreadCount > 0 && (
                              <Badge variant="default" className="text-xs">
                                {thread.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {thread.lastMessagePreview}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(toDate(thread.lastMessageAt), "PPp", {
                              locale,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2">
          {selectedThread ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelectedThread(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedThread.subject}
                    </CardTitle>
                    <CardDescription>
                      {t("portal:messages.with", {
                        organization: selectedThread.organizationName,
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[350px] p-4">
                  {messages.isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-3/4" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.data?.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.senderType === "portal_user"
                              ? "justify-end"
                              : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-lg p-3",
                              message.senderType === "portal_user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted",
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                message.senderType === "portal_user"
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              {format(toDate(message.createdAt), "PPp", {
                                locale,
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Reply Input */}
                {!selectedThread.isClosed && (
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("portal:messages.replyPlaceholder")}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendReply}
                        disabled={sending || !replyMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedThread.isClosed && (
                  <div className="border-t p-4 text-center text-sm text-muted-foreground">
                    {t("portal:messages.threadClosed")}
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex h-[450px] items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  {t("portal:messages.selectConversation")}
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
