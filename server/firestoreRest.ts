import rawConfig from '../firebase-applet-config.json';

const projectId = rawConfig.projectId || 'blazestoreapp';
const apiKey = rawConfig.apiKey || '';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return {
      mapValue: { fields },
    };
  }
  return { stringValue: String(val) };
}

export function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

export function fromFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    data[k] = fromFirestoreValue(v);
  }
  const id = doc.name ? doc.name.split('/').pop() : undefined;
  return { ...data, id: data.id || id };
}

export async function restGetCollection(collectionName: string): Promise<any[]> {
  try {
    const url = `${BASE_URL}/${collectionName}?key=${apiKey}&pageSize=300`;
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }
    const json = (await res.json()) as any;
    if (!json.documents) return [];
    return json.documents.map(fromFirestoreDoc).filter(Boolean);
  } catch {
    return [];
  }
}

export async function restGetDoc(collectionName: string, docId: string): Promise<any | null> {
  try {
    const url = `${BASE_URL}/${collectionName}/${docId}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return fromFirestoreDoc(json);
  } catch {
    return null;
  }
}

export async function restSetDoc(collectionName: string, docId: string, data: any): Promise<any> {
  try {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    const url = `${BASE_URL}/${collectionName}/${docId}?key=${apiKey}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return { ...data, id: docId };
  } catch {
    return { ...data, id: docId };
  }
}

export async function restDeleteDoc(collectionName: string, docId: string): Promise<boolean> {
  try {
    const url = `${BASE_URL}/${collectionName}/${docId}?key=${apiKey}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
