/**
 * Type declarations for net-snmp library
 * Based on net-snmp v3.x API
 */

declare module 'net-snmp' {
    export enum Version {
        Version1 = 0,
        Version2c = 1,
        Version3 = 3
    }

    export const Version1 = Version.Version1;
    export const Version2c = Version.Version2c;
    export const Version3 = Version.Version3;

    export enum AuthProtocol {
        md5 = 'md5',
        sha = 'sha',
        sha256 = 'sha256',
        sha384 = 'sha384',
        sha512 = 'sha512'
    }

    export const AuthProtocols = {
        md5: AuthProtocol.md5,
        sha: AuthProtocol.sha,
        sha256: AuthProtocol.sha256,
        sha384: AuthProtocol.sha384,
        sha512: AuthProtocol.sha512
    };

    export enum PrivProtocol {
        des = 'des',
        aes = 'aes',
        aes256 = 'aes256'
    }

    export const PrivProtocols = {
        des: PrivProtocol.des,
        aes: PrivProtocol.aes,
        aes256: PrivProtocol.aes256
    };

    export interface SessionOptions {
        port?: number;
        retries?: number;
        timeout?: number;
        transport?: string;
        trapPort?: number;
        version?: Version;
        idBitsSize?: number;
        context?: string;
    }

    export interface V3SessionOptions extends SessionOptions {
        user: string;
        authProtocol?: AuthProtocol;
        authKey?: string;
        privProtocol?: PrivProtocol;
        privKey?: string;
        engineID?: string;
    }

    export interface Varbind {
        oid: string;
        type: number;
        value: any;
    }

    export type GetCallback = (error: Error | null, varbinds: Varbind[]) => void;
    export type SetCallback = (error: Error | null, varbinds: Varbind[]) => void;
    export type WalkCallback = (error?: Error) => void;
    export type FeedCallback = (varbind: Varbind) => boolean | void;

    export class Session {
        constructor(target: string, community: string, options?: SessionOptions);
        close(): void;
        get(oids: string[], callback: GetCallback): void;
        getNext(oids: string[], callback: GetCallback): void;
        getBulk(oids: string[], nonRepeaters: number, maxRepetitions: number, callback: GetCallback): void;
        set(varbinds: Varbind[], callback: SetCallback): void;
        walk(oid: string, maxRepetitions: number, feedCallback: FeedCallback, doneCallback: WalkCallback): void;
        subtree(oid: string, maxRepetitions: number, feedCallback: FeedCallback, doneCallback: WalkCallback): void;
        table(oid: string, callback: (error: Error | null, table: any) => void): void;
        tableColumns(oid: string, columns: string[], callback: (error: Error | null, table: any) => void): void;
        trap(typeOrOid: number | string, varbinds?: Varbind[], agentAddress?: string): void;
        inform(typeOrOid: number | string, varbinds: Varbind[], callback: (error: Error | null) => void): void;
    }

    export function createSession(target: string, community: string, options?: SessionOptions): Session;
    export function createV3Session(target: string, options: V3SessionOptions): Session;

    export function isVarbindError(varbind: Varbind): boolean;
    export function varbindError(varbind: Varbind): string;

    // Object Types
    export const ObjectType = {
        Boolean: 1,
        Integer: 2,
        BitString: 3,
        OctetString: 4,
        Null: 5,
        OID: 6,
        IpAddress: 64,
        Counter: 65,
        Gauge: 66,
        TimeTicks: 67,
        Opaque: 68,
        NsapAddress: 69,
        Counter64: 70,
        NoSuchObject: 128,
        NoSuchInstance: 129,
        EndOfMibView: 130
    };

    // Error Status
    export const ErrorStatus = {
        NoError: 0,
        TooBig: 1,
        NoSuchName: 2,
        BadValue: 3,
        ReadOnly: 4,
        GeneralError: 5,
        NoAccess: 6,
        WrongType: 7,
        WrongLength: 8,
        WrongEncoding: 9,
        WrongValue: 10,
        NoCreation: 11,
        InconsistentValue: 12,
        ResourceUnavailable: 13,
        CommitFailed: 14,
        UndoFailed: 15,
        AuthorizationError: 16,
        NotWritable: 17,
        InconsistentName: 18
    };

    // Trap Types
    export const TrapType = {
        ColdStart: 0,
        WarmStart: 1,
        LinkDown: 2,
        LinkUp: 3,
        AuthenticationFailure: 4,
        EgpNeighborLoss: 5,
        EnterpriseSpecific: 6
    };
}