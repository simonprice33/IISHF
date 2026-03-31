// src/components/MemberAssociations/MemberAssociations.tsx
import { getMemberAssociationSlides } from "@/lib/galleryApi";
import { MemberAssociationsClient } from "./MemberAssociationsClient";

export async function MemberAssociations() {
  const slides = await getMemberAssociationSlides();

  if (!slides.length) return null;

  return <MemberAssociationsClient slides={slides} />;
}
