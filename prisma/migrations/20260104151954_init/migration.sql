/*
  Warnings:

  - You are about to drop the column `startTime` on the `MatchService` table. All the data in the column will be lost.
  - Added the required column `duration` to the `MatchService` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "round" INTEGER NOT NULL,
    "team1Id" INTEGER NOT NULL,
    "team2Id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "duration" INTEGER NOT NULL,
    "endTime" DATETIME,
    "firstTeamScore" INTEGER,
    "secondTeamScore" INTEGER,
    CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("endTime", "firstTeamScore", "id", "round", "secondTeamScore", "status", "team1Id", "team2Id") SELECT "endTime", "firstTeamScore", "id", "round", "secondTeamScore", "status", "team1Id", "team2Id" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "MatchService";
CREATE INDEX "Match_team1Id_idx" ON "Match"("team1Id");
CREATE INDEX "Match_team2Id_idx" ON "Match"("team2Id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
