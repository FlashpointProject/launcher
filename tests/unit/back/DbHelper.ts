import { Connection, createConnection } from 'typeorm';
import * as Database from 'better-sqlite3';

export class DbHelper {

  private static _instance: DbHelper;

  public static get instance(): DbHelper {
    if (!this._instance) {
      this._instance = new DbHelper();
    }
    return this._instance;
  }

  private dbConnect!: Connection;
  private testdb!: any;

  async setupTestDB() {
    this.testdb = new Database(':memory:', { verbose: console.log });
    this.dbConnect = await createConnection({
      name: 'default',
      type: 'better-sqlite3',
      database: ':memory:',
      entities: ['src/database/entity/**/*.ts'],
      migrations: ['src/database/migration/**/*.ts'],
      synchronize: true
    });
  }

  teardownTestDB() {
    this.dbConnect.close();
    this.testdb.close();
  }
}
