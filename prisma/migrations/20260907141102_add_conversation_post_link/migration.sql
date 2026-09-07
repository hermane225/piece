-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "postId" TEXT;

-- CreateIndex
CREATE INDEX "conversations_postId_idx" ON "conversations"("postId");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
