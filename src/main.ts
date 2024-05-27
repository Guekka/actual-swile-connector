import { SwileData, getSwileData } from './swile'
import { getToken } from './auth'
import actual from '@actual-app/api';
import { cached, log, getCachePath } from './utils';

const SWILE_LOGIN = process.env['SWILE_LOGIN']
const SWILE_PASSWORD = process.env['SWILE_PASSWORD']
const ACTUAL_URL = process.env['ACTUAL_URL']
const ACTUAL_PASSWORD = process.env['ACTUAL_PASSWORD']
const ACTUAL_BUDGET_ID = process.env['ACTUAL_BUDGET_ID']
const ACTUAL_ACCOUNT_NAME = "Swile";

class SwileConnector {
    async run() {
        try {
            /*
            const swileDataCachePath = getCachePath({ subDir: 'swile', fileName: 'cache.json' });
            const swileData = await cached<SwileData>(swileDataCachePath, async () => {
            });
            */
            const token = await getToken(SWILE_LOGIN, SWILE_PASSWORD)
            const swileData = await getSwileData(SWILE_LOGIN, token)

            log('info', 'Successfully fetched data')
            log('info', 'Parsing ...')

            const accountId = await this.getAccount();
            const transactions = this.parseTransactions(swileData.operations);
            actual.importTransactions(accountId, transactions);
        } catch (e) {
            log('error', e)
            log('error', e.stack)
        }
    }

    async getAccount(): Promise<string> {
        try {
            const accounts = await actual.getAccounts();

            const account = accounts.find((a: any) => a.name === ACTUAL_ACCOUNT_NAME);
            if (account) {
                return account.id;
            }

            return await actual.createAccount({
                name: ACTUAL_ACCOUNT_NAME,
                type: 'checkings'
            }).id;
        } catch (e) {
            log('error', e)
            log('error', e.stack)
            throw new Error('Error getting account');
        }
    }

    parseTransactions(operations: any[]) {
        return operations.map((op: any) => {
            const transaction = op.transactions.filter((t: any) => t.type === 'ORIGIN')[0]
            const wallet = transaction.wallet;
            const date = new Date(op.date)
            return {
                account: wallet.uuid,
                date: date,
                amount: transaction.amount.value,
                payee_name: op.name,
                imported_payee: op.name,
                imported_id: op.id,
            };
        });
    }
}

async function main() {
    await actual.init({
        dataDir: getCachePath({ subDir: 'actual' }),
        serverURL: ACTUAL_URL,
        password: ACTUAL_PASSWORD,
    });

    await actual.downloadBudget(ACTUAL_BUDGET_ID);

    const connector = new SwileConnector();
    await connector.run();

    await actual.shutdown();
}

await main()
