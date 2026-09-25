export type BookIndexCollectedBook = {
  sourceKey: string;
  sourceExternalId?: string | null;
  title: string;
  authorName?: string | null;
  publisherName?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  productUrl: string;
  imageUrl?: string | null;
  rank: number;
  priceAmount?: bigint | null;
  currency?: string | null;
};

export type BookIndexCollectionContext = {
  listCode: string;
  sourceUrl: string;
  observedAt: Date;
};

export type BookIndexCollectionResult = {
  books: BookIndexCollectedBook[];
  sourceFingerprint?: string | null;
};

export interface BookIndexSourceAdapter {
  readonly sourceCode: string;
  collect(
    context: BookIndexCollectionContext,
  ): Promise<BookIndexCollectionResult>;
}

// Adapters are deliberately source-local. A parser/API failure for one source
// must not stop collection from unrelated sources.
export type BookIndexAdapterRegistry = ReadonlyMap<
  string,
  BookIndexSourceAdapter
>;
