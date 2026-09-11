/** Reserved extension point. The current release never invokes an artifact store. */
export interface ArtifactStore {
  put(input: ArtifactInput): Promise<StoredArtifact>;
  get(id: string): Promise<Uint8Array | null>;
  delete(id: string): Promise<void>;
}

export interface ArtifactInput {
  data: Uint8Array;
  contentType: string;
  extension: string;
  expiresAt?: Date;
}

export interface StoredArtifact {
  id: string;
  contentType: string;
  size: number;
  expiresAt?: Date;
}
