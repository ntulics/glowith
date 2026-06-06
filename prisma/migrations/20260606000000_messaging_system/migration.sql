-- Drop old simple Message table (no conversations, was provider-centric read-only list)
DROP TABLE IF EXISTS "Message";

-- CreateTable: Conversation
CREATE TABLE "Conversation" (
    "id"        TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ConversationParticipant
CREATE TABLE "ConversationParticipant" (
    "id"             TEXT         NOT NULL,
    "conversationId" TEXT         NOT NULL,
    "userId"         TEXT         NOT NULL,
    "lastReadAt"     TIMESTAMP(3),
    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique participant per conversation
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key"
    ON "ConversationParticipant"("conversationId", "userId");

-- AddForeignKey: ConversationParticipant → Conversation
ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ConversationParticipant → User
ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Message (new, conversation-based)
CREATE TABLE "Message" (
    "id"             TEXT         NOT NULL,
    "conversationId" TEXT         NOT NULL,
    "senderId"       TEXT         NOT NULL,
    "body"           TEXT         NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt"       TIMESTAMP(3),
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Message → Conversation
ALTER TABLE "Message"
    ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Message → User (sender)
ALTER TABLE "Message"
    ADD CONSTRAINT "Message_sender_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: MessageReaction
CREATE TABLE "MessageReaction" (
    "id"        TEXT         NOT NULL,
    "messageId" TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "emoji"     TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: one emoji per user per message
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key"
    ON "MessageReaction"("messageId", "userId", "emoji");

-- AddForeignKey: MessageReaction → Message
ALTER TABLE "MessageReaction"
    ADD CONSTRAINT "MessageReaction_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: MessageReaction → User
ALTER TABLE "MessageReaction"
    ADD CONSTRAINT "MessageReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
