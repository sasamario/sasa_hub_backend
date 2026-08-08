-- CreateEnum
CREATE TYPE "github_type" AS ENUM ('commit', 'pull_request');

-- CreateEnum
CREATE TYPE "sync_source" AS ENUM ('github', 'qiita');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('success', 'failed');

-- CreateTable
CREATE TABLE "github_activities" (
    "id" SERIAL NOT NULL,
    "type" "github_type" NOT NULL,
    "external_id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "activity_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qiita_articles" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "activity_date" TIMESTAMP(3) NOT NULL,
    "likes_count" INTEGER NOT NULL,
    "stocks_count" INTEGER NOT NULL,
    "page_views_count" INTEGER,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qiita_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "source" "sync_source" NOT NULL,
    "repository" TEXT,
    "status" "sync_status" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_activities_type_repository_external_id_key" ON "github_activities"("type", "repository", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "qiita_articles_external_id_key" ON "qiita_articles"("external_id");
