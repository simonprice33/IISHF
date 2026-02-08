// src/components/MemberAssociations/MemberAssociations.tsx
import { getMemberAssociationSlides } from "@/lib/galleryApi";
import { MemberAssociationsClient } from "./MemberAssociationsClient";

export async function MemberAssociations() {
  const slides = await getMemberAssociationSlides();

console.log("MemberAssociations slides", slides);
  if (!slides.length) return null;

  return <MemberAssociationsClient slides={slides} />;
}
