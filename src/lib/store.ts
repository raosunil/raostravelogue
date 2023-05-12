import { writable as internal, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
declare type Updater<T> = (value: T) => T;
declare type StoreDict<T> = { [key: string]: Writable<T> };

/* eslint-disable @typescript-eslint/no-explicit-any */
const stores: StoreDict<any> = {};

interface Serializer<T> {
	parse(text: string): T;
	stringify(object: T): string;
}

interface Options<T> {
	serializer: Serializer<T>;
}

export function writable<T>(key: string, initialValue: T, options?: Options<T>): Writable<T> {
	const browser = typeof localStorage != 'undefined' && typeof window != 'undefined';
	const serializer = options?.serializer || JSON;

	function updateStorage(key: string, value: T) {
		if (!browser) return;

		localStorage.setItem(key, serializer.stringify(value));
	}

	if (!stores[key]) {
		const store = internal(initialValue, (set) => {
			const json = browser ? localStorage.getItem(key) : null;

			if (json) {
				set(<T>serializer.parse(json));
			}

			if (browser) {
				const handleStorage = (event: StorageEvent) => {
					if (event.key === key) set(event.newValue ? serializer.parse(event.newValue) : null);
				};

				window.addEventListener('storage', handleStorage);

				return () => window.removeEventListener('storage', handleStorage);
			}
		});

		const { subscribe, set } = store;

		stores[key] = {
			set(value: T) {
				updateStorage(key, value);
				set(value);
			},
			update(updater: Updater<T>) {
				const value = updater(get(store));

				updateStorage(key, value);
				set(value);
			},
			subscribe
		};
	}

	return stores[key];
}
