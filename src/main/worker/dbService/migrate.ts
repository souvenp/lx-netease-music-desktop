import type Database from 'better-sqlite3'
import tables, { DB_VERSION } from './tables'

// const migrateV1 = (db: Database.Database) => {
//   const sql = `
//     DROP TABLE "main"."download_list";

//     CREATE TABLE "download_list" (
//       "id" TEXT NOT NULL,
//       "isComplate" INTEGER NOT NULL,
//       "status" TEXT NOT NULL,
//       "statusText" TEXT NOT NULL,
//       "progress_downloaded" INTEGER NOT NULL,
//       "progress_total" INTEGER NOT NULL,
//       "url" TEXT,
//       "quality" TEXT NOT NULL,
//       "ext" TEXT NOT NULL,
//       "fileName" TEXT NOT NULL,
//       "filePath" TEXT NOT NULL,
//       "musicInfo" TEXT NOT NULL,
//       "position" INTEGER NOT NULL,
//       PRIMARY KEY("id")
//     );
//   `
//   db.exec(sql)
//   db.prepare('UPDATE "main"."db_info" SET "field_value"=@value WHERE "field_name"=@name').run({ name: 'version', value: '2' })
// }

const migrateV1 = (db: Database.Database) => {
  // 修复 v2.4.0 的默认数据库版本号不对的问题
  const existsTable = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'table\' AND name=\'dislike_list\';').get()
  if (!existsTable) {
    const sql = tables.get('dislike_list')!
    db.exec(sql)
  }
}

const hasColumn = (db: Database.Database, tableName: string, columnName: string) => {
  return (db.prepare(`PRAGMA table_info("${tableName}")`).all() as Array<{ name: string }>).some(info => info.name == columnName)
}

const migrateV2 = (db: Database.Database) => {
  if (!hasColumn(db, 'download_list', 'createdAt')) {
    db.exec('ALTER TABLE "main"."download_list" ADD COLUMN "createdAt" INTEGER NOT NULL DEFAULT 0;')
  }
  if (!hasColumn(db, 'download_list', 'isRemoteSynced')) {
    db.exec('ALTER TABLE "main"."download_list" ADD COLUMN "isRemoteSynced" INTEGER NOT NULL DEFAULT 0;')
  }
  db.exec('UPDATE "main"."download_list" SET "createdAt" = ((strftime(\'%s\', \'now\') * 1000) - "position") WHERE "createdAt" IS NULL OR "createdAt" = 0;')
}

export default (db: Database.Database) => {
  // PRAGMA user_version = x
  // console.log(db.prepare('PRAGMA user_version').get().user_version)
  // https://github.com/WiseLibs/better-sqlite3/issues/668#issuecomment-1145285728
  const version = (db.prepare<[string]>('SELECT "field_value" FROM "main"."db_info" WHERE "field_name" = ?').get('version') as { field_value: string }).field_value
  switch (version) {
    case '1':
      migrateV1(db)
      migrateV2(db)
      db.prepare('UPDATE "main"."db_info" SET "field_value"=@value WHERE "field_name"=@name').run({ name: 'version', value: DB_VERSION })
      break
    case '2':
      migrateV2(db)
      db.prepare('UPDATE "main"."db_info" SET "field_value"=@value WHERE "field_name"=@name').run({ name: 'version', value: DB_VERSION })
      break
  }
}
