-- AlterTable
ALTER TABLE "Team" ADD COLUMN "loses" INTEGER;
ALTER TABLE "Team" ADD COLUMN "wins" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "team1Id" TEXT NOT NULL,
    "team2Id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "firstTeamScore" INTEGER,
    "secondTeamScore" INTEGER,
    CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("endTime", "firstTeamScore", "id", "secondTeamScore", "startTime", "status", "team1Id", "team2Id") SELECT "endTime", "firstTeamScore", "id", "secondTeamScore", "startTime", "status", "team1Id", "team2Id" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "MatchService";
CREATE INDEX "Match_startTime_idx" ON "Match"("startTime");
CREATE INDEX "Match_team1Id_idx" ON "Match"("team1Id");
CREATE INDEX "Match_team2Id_idx" ON "Match"("team2Id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
