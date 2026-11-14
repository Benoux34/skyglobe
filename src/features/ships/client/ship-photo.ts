"use client";

import { createRemoteResource } from "@/shared/lib/remote-resource";
import { fetchShipPhoto, type CommonsPhoto } from "@/shared/wikimedia/commons";

/** A photo of a ship from Wikimedia Commons, found by its IMO number. */
export const useShipPhoto = createRemoteResource<number, CommonsPhoto | null>({
  name: "ship photo",
  keyOf: String,
  load: fetchShipPhoto,
});
