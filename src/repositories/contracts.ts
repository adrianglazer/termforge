import type {
  ConnectionHistory,
  Id,
  KeyMetadata,
  KnownHost,
  Server,
  Settings,
  Snippet,
  Workspace,
} from '@/types/domain';
export interface Repository<T extends { id: Id }> {
  get(id: Id): Promise<T | undefined>;
  list(): Promise<T[]>;
  save(value: T): Promise<void>;
  remove(id: Id): Promise<void>;
}
export type Repositories = {
  servers: Repository<Server>;
  keys: Repository<KeyMetadata>;
  workspaces: Repository<Workspace>;
  snippets: Repository<Snippet>;
  knownHosts: Repository<KnownHost>;
  history: Repository<ConnectionHistory>;
  settings: { get(): Promise<Settings>; save(value: Settings): Promise<void> };
};
