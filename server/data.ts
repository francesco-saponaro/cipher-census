import type { Asset, Service } from "./types.ts";
import inventory from "./data/assets.json" with { type: "json" };
import serviceRows from "./data/services.json" with { type: "json" };

/** The day the inventory was taken; every margin is measured from it. */
export const asOf: string = inventory.asOf;
export const assets: readonly Asset[] = inventory.assets as Asset[];
export const services: readonly Service[] = serviceRows as Service[];
export const teams: readonly string[] = [...new Set(services.map((service) => service.team))];
