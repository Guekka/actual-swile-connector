import { log } from './utils'

const API_ROOT = 'https://neobank-api.swile.co/api'

export class SwileData {
    constructor(public cards: any[], public operations: any[]) { }
}

class SwileApi {
    email: string
    token: string
    headers: Headers

    constructor(email: string, token: string) {
        this.email = email
        this.token = token

        console.log('info', `email: ${email}, token: ${token}`)

        const myHeaders = new Headers()
        myHeaders.append('Authorization', 'Bearer ' + token)
        myHeaders.append('Content-Type', 'application/json')
        this.headers = myHeaders
    }

    makeRequestOptions(method: string, body: string | null = null): RequestInit {
        return {
            method: method,
            headers: this.headers,
            redirect: 'follow',
            body: body
        }
    }

    async fetch(url: string, method: string = 'GET', body: string | null = null): Promise<any> {
        log('info', `req on ${url}: ${method} ${body}`)
        return await fetch(
            `${API_ROOT}/${url}`,
            this.makeRequestOptions(method, body)
        ).then(response => response.json())
            .then(data => {
                log('info', `res on ${url}: ${JSON.stringify(data)}`)
                return data
            })
    }

    async getCards() {
        return (await this.fetch(`v0/wallets`)).wallets.filter(
            (w: any) => w.id !== 'null-wallet'
        )
    }

    async getAllOperations() {
        return (await this.fetch(`v3/user/operations?per=999999`)).items.filter(
            (op: any) => {
                op.transactions = op.transactions.filter((t: any) => t.type === 'ORIGIN')
                if (op.transactions.length !== 1) {
                    log(
                        'warn',
                        `operation ${op.id} has ${op.transactions.length} transactions`
                    )
                    return false
                }
                const transaction = op.transactions[0]
                return (
                    transaction.status === 'CAPTURED' ||
                    transaction.status === 'VALIDATED'
                )
            }
        )
    }
}

export async function getSwileData(email: string, token: string): Promise<SwileData> {
    const api = new SwileApi(email, token)
    const cards = await api.getCards()
    const operations = await api.getAllOperations()
    return new SwileData(cards, operations)
}
