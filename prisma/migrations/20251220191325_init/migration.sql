/*
  Warnings:

  - The primary key for the `Admin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Admin` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `MatchService` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `MatchService` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `team1Id` on the `MatchService` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `team2Id` on the `MatchService` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Team` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Team` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userName" TEXT NOT NULL,
    "password" TEXT NOT NULL
);
INSERT INTO "new_Admin" ("id", "password", "userName") SELECT "id", "password", "userName" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_userName_key" ON "Admin"("userName");
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "round" INTEGER NOT NULL,
    "team1Id" INTEGER NOT NULL,
    "team2Id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "firstTeamScore" INTEGER,
    "secondTeamScore" INTEGER,
    CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("endTime", "firstTeamScore", "id", "round", "secondTeamScore", "startTime", "status", "team1Id", "team2Id") SELECT "endTime", "firstTeamScore", "id", "round", "secondTeamScore", "startTime", "status", "team1Id", "team2Id" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "MatchService";
CREATE INDEX "Match_startTime_idx" ON "Match"("startTime");
CREATE INDEX "Match_team1Id_idx" ON "Match"("team1Id");
CREATE INDEX "Match_team2Id_idx" ON "Match"("team2Id");
CREATE TABLE "new_Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "score" INTEGER DEFAULT 0
);
INSERT INTO "new_Team" ("id", "name", "score") SELECT "id", "name", "score" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
