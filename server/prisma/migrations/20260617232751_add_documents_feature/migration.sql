-- CreateTable
CREATE TABLE "DocFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocFolder_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "folderId" TEXT,
    "title" TEXT NOT NULL DEFAULT '未命名文档',
    "content" TEXT NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocPermission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "blockId" TEXT,
    "blockText" TEXT,
    "parentId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocComment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocComment_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocMention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "DocComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocRecent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocRecent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocRecent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocFavorite_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "shareType" TEXT NOT NULL DEFAULT 'private',
    "teamRole" TEXT,
    "linkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "linkRole" TEXT,
    "linkToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DocFolder_teamId_idx" ON "DocFolder"("teamId");

-- CreateIndex
CREATE INDEX "DocFolder_parentId_idx" ON "DocFolder"("parentId");

-- CreateIndex
CREATE INDEX "Document_teamId_idx" ON "Document"("teamId");

-- CreateIndex
CREATE INDEX "Document_folderId_idx" ON "Document"("folderId");

-- CreateIndex
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");

-- CreateIndex
CREATE INDEX "DocPermission_userId_idx" ON "DocPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocPermission_documentId_userId_key" ON "DocPermission"("documentId", "userId");

-- CreateIndex
CREATE INDEX "DocComment_documentId_idx" ON "DocComment"("documentId");

-- CreateIndex
CREATE INDEX "DocComment_parentId_idx" ON "DocComment"("parentId");

-- CreateIndex
CREATE INDEX "DocComment_userId_idx" ON "DocComment"("userId");

-- CreateIndex
CREATE INDEX "DocMention_userId_idx" ON "DocMention"("userId");

-- CreateIndex
CREATE INDEX "DocRecent_userId_idx" ON "DocRecent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocRecent_userId_documentId_key" ON "DocRecent"("userId", "documentId");

-- CreateIndex
CREATE INDEX "DocFavorite_userId_idx" ON "DocFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocFavorite_userId_documentId_key" ON "DocFavorite"("userId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocShare_linkToken_key" ON "DocShare"("linkToken");

-- CreateIndex
CREATE UNIQUE INDEX "DocShare_documentId_key" ON "DocShare"("documentId");
