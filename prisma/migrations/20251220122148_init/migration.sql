-- Current SQLite schema baseline.
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userName" TEXT NOT NULL,
    "password" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_userName_key" ON "Admin"("userName");

CREATE TABLE IF NOT EXISTS "Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "score" INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "Team_name_key" ON "Team"("name");

CREATE TABLE IF NOT EXISTS "MatchService" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "round" INTEGER NOT NULL,
    "team1Id" INTEGER NOT NULL,
    "team2Id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "duration" INTEGER NOT NULL,
    "endTime" DATETIME,
    "firstTeamScore" INTEGER,
    "secondTeamScore" INTEGER,
    CONSTRAINT "MatchService_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchService_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MatchService_team1Id_idx" ON "MatchService"("team1Id");
CREATE INDEX IF NOT EXISTS "MatchService_team2Id_idx" ON "MatchService"("team2Id");

CREATE TABLE IF NOT EXISTS "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "avalible_balance" INTEGER NOT NULL DEFAULT 0,
    "frozen_balance" INTEGER NOT NULL DEFAULT 0,
    "code_requests" INTEGER NOT NULL DEFAULT 0,
    "last_code_request" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_is_banned_idx" ON "User"("is_banned");
CREATE INDEX IF NOT EXISTS "User_is_verified_idx" ON "User"("is_verified");

CREATE TABLE IF NOT EXISTS "Code" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hashed_code" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Code_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Code_userId_key" ON "Code"("userId");

CREATE TABLE IF NOT EXISTS "Bets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "pick" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bets_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "MatchService" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Bets_matchId_idx" ON "Bets"("matchId");
CREATE INDEX IF NOT EXISTS "Bets_userId_idx" ON "Bets"("userId");
