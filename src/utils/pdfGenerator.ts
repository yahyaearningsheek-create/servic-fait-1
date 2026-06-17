/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";
import { Intervention } from "../types";

// Helper to fetch and convert image to base64
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const absoluteUrl = imageUrl.startsWith("/") ? origin + imageUrl : imageUrl;
    const res = await fetch(absoluteUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export async function generateAndDownloadPDF(intervention: Intervention): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Get official base64 logo
  const imgData = await getBase64ImageFromUrl("/logo.jpeg");

  let currentY = 15;

  // 1. HEADER SECTION
  if (imgData) {
    // Draw Logo CNIPLC
    doc.addImage(imgData, "JPEG", 15, currentY, 20, 20);
    
    // State Text with indentation
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("RÉPUBLIQUE DE DJIBOUTI", 38, currentY + 3);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42); // Slate-900
    const headerLines = doc.splitTextToSize("COMMISSION NATIONALE INDÉPENDANTE POUR LA PRÉVENTION ET LA LUTTE CONTRE LA CORRUPTION", 100);
    doc.text(headerLines, 38, currentY + 7);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(197, 160, 67); // Gold-500
    doc.text("CNIPLC - SERVICES TECHNIQUES DE L'INFORMATIQUE", 38, currentY + 16);
  } else {
    // Fallback title text if logo doesn't fetch
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("RÉPUBLIQUE DE DJIBOUTI", 15, currentY + 3);
    
    doc.setFontSize(8);
    const headerLines = doc.splitTextToSize("COMMISSION NATIONALE INDÉPENDANTE POUR LA PRÉVENTION ET LA LUTTE CONTRE LA CORRUPTION", 120);
    doc.text(headerLines, 15, currentY + 8);
    
    doc.setFontSize(8);
    doc.setTextColor(197, 160, 67);
    doc.text("CNIPLC - SERVICES TECHNIQUES DE L'INFORMATIQUE", 15, currentY + 18);
  }

  // Metadata block (Right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`REF : ${intervention.refNumber}`, 195, currentY + 4, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date : ${new Date(intervention.date).toLocaleDateString('fr-FR')}`, 195, currentY + 9, { align: "right" });
  doc.text(`Durée : ${intervention.durationMinutes} min`, 195, currentY + 14, { align: "right" });

  // Horizontal separator Gold styled line
  currentY += 23;
  doc.setDrawColor(197, 160, 67); // Gold
  doc.setLineWidth(0.8);
  doc.line(15, currentY, 195, currentY);

  // 2. DOCUMENT CORE TITLE
  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text("FICHE D'INTERVENTION TECHNIQUE", 105, currentY, { align: "center" });
  
  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(197, 160, 67);
  doc.text("& ATTESTATION DE SERVICE FAIT", 105, currentY, { align: "center" });

  // 3. PARTIES GRID BOX
  currentY += 10;
  // Background and border boxes for parties
  doc.setFillColor(253, 250, 242); // Warm Gold-50 accent
  doc.roundedRect(15, currentY, 86, 30, 2, 2, "F");
  doc.setDrawColor(242, 223, 174); // Gold-200 border
  doc.setLineWidth(0.25);
  doc.roundedRect(15, currentY, 86, 30, 2, 2, "D");
  
  doc.setFillColor(253, 250, 242);
  doc.roundedRect(109, currentY, 86, 30, 2, 2, "F");
  doc.setDrawColor(242, 223, 174);
  doc.roundedRect(109, currentY, 86, 30, 2, 2, "D");

  // Column 1 content
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(147, 113, 35); // Gold-700
  doc.text("INTERVENANT (TECHNICIEN IT)", 19, currentY + 5);
  doc.setDrawColor(245, 231, 194);
  doc.setLineWidth(0.15);
  doc.line(19, currentY + 6.5, 95, currentY + 6.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(intervention.techName, 19, currentY + 12);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(intervention.techTitle, 19, currentY + 17);
  doc.text("Département d'Origine : CNIPLC Informatique", 19, currentY + 22);

  // Column 2 content
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(147, 113, 35);
  doc.text("BÉNÉFICIAIRE (DEMANDEUR)", 113, currentY + 5);
  doc.line(113, currentY + 6.5, 189, currentY + 6.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(intervention.clientName, 113, currentY + 12);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(intervention.clientTitle, 113, currentY + 17);
  doc.text(`Département/Direction : ${intervention.clientDepartment}`, 113, currentY + 22);

  // 4. EQUIPMENT SPECIFICATIONS
  currentY += 36;
  doc.setFillColor(253, 250, 242);
  doc.roundedRect(15, currentY, 180, 20, 1.5, 1.5, "F");
  doc.setDrawColor(242, 223, 174);
  doc.setLineWidth(0.25);
  doc.roundedRect(15, currentY, 180, 20, 1.5, 1.5, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(115, 84, 24); // Gold-850
  doc.text("DÉTAILS DE L'ÉQUIPEMENT INFORMATIQUE CONCERNÉ", 19, currentY + 5);
  doc.setDrawColor(245, 231, 194);
  doc.line(19, currentY + 6.5, 191, currentY + 6.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Type de matériel :", 19, currentY + 11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intervention.deviceType.toUpperCase(), 19, currentY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Modèle / Marque :", 79, currentY + 11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intervention.deviceBrand || "Standard/Inconnu", 79, currentY + 15);

  // Since Asset Tag inventory input is deleted, we either read it from data or display static/N/A
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("N° Inventaire (Asset Code) :", 139, currentY + 11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intervention.deviceInventory || "N/A", 139, currentY + 15);

  // 5. RAPPORT SYNTHÉTIQUE
  currentY += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("RAPPORT SYNTHÉTIQUE D'INTERVENTION", 15, currentY);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(15, currentY + 1.5, 195, currentY + 1.5);

  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59); // Slate-800
  
  const summaryText = intervention.professionalSummary || "Aucune description rédigée.";
  const wrappedSummary = doc.splitTextToSize(summaryText, 180);
  doc.text(wrappedSummary, 15, currentY);

  currentY += (wrappedSummary.length * 4.2) + 5;

  // Render quickNotes if present
  if (intervention.quickNotes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); 
    doc.text("Notes rapides / Observations complémentaires :", 15, currentY);
    currentY += 4.5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    const wrappedQuickNotes = doc.splitTextToSize(intervention.quickNotes, 180);
    doc.text(wrappedQuickNotes, 15, currentY);
    currentY += (wrappedQuickNotes.length * 3.8) + 5;
  }

  // 6. ACTION NOMENCLATURE TABLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("NOMENCLATURE DES ACTIONS TECHNIQUES RÉALISÉES", 15, currentY);
  doc.line(15, currentY + 1.5, 195, currentY + 1.5);

  currentY += 5;
  
  // Draw Table Header Backplate
  doc.setFillColor(15, 23, 42); // Black slate
  doc.rect(15, currentY, 180, 7, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("N°", 18, currentY + 4.8);
  doc.text("Action de Maintenance Corrective et Préventive", 26, currentY + 4.8);
  doc.text("Catégorie", 146, currentY + 4.8);
  doc.text("Statut", 176, currentY + 4.8);

  currentY += 7;

  // Draw table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  intervention.tasks.forEach((task, index) => {
    // Compute wrapped task line
    const wrappedDesc = doc.splitTextToSize(task.description, 115);
    const rowHeight = Math.max(wrappedDesc.length * 4, 7);

    // Grid boundaries
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(15, currentY + rowHeight, 195, currentY + rowHeight); // Row floor

    // Draw vertical column separators
    doc.line(15, currentY, 15, currentY + rowHeight);
    doc.line(23, currentY, 23, currentY + rowHeight);
    doc.line(142, currentY, 142, currentY + rowHeight);
    doc.line(172, currentY, 172, currentY + rowHeight);
    doc.line(195, currentY, 195, currentY + rowHeight);

    // Row Text Fill
    doc.setTextColor(71, 85, 105);
    doc.text((index + 1).toString(), 19, currentY + 4.5, { align: "center" });
    
    doc.setTextColor(15, 23, 42);
    doc.text(wrappedDesc, 26, currentY + 4.5);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(147, 113, 35); // Gold-700
    doc.text(task.category, 144, currentY + 4.5);
    
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text("✓ FAIT", 176, currentY + 4.5);
    
    doc.setFont("helvetica", "normal");
    currentY += rowHeight;
  });

  if (intervention.tasks.length === 0) {
    doc.setDrawColor(226, 232, 240);
    doc.line(15, currentY + 8, 195, currentY + 8);
    doc.rect(15, currentY, 180, 8);
    doc.setTextColor(148, 163, 184);
    doc.text("Aucun acte technique enregistré.", 105, currentY + 5.5, { align: "center" });
    currentY += 8;
  }

  // Check if page overflow is imminent
  if (currentY > 225) {
    doc.addPage();
    currentY = 20;
  }

  // 7. COMMITMENT STATEMENT
  currentY += 8;
  doc.setFillColor(253, 250, 242);
  doc.roundedRect(15, currentY, 180, 18, 1, 1, "F");
  doc.setDrawColor(242, 223, 174);
  doc.roundedRect(15, currentY, 180, 18, 1, 1, "D");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(115, 115, 115);
  
  const declaration = "Déclaration administrative : Ce document atteste de la réalisation effective des travaux de dépannage, d'assistance, d'installation d'équipements ou de maintenance réseau décrits ci-dessus par les services informatiques d'État (CNIPLC). Le bénéficiaire (ou le Directeur de Service) atteste par sa signature que les systèmes informatiques mentionnés sont d'une part réparés, fonctionnels, conformes aux exigences professionnelles et que la prestation a été clôturée avec succès.";
  const wrappedDecl = doc.splitTextToSize(declaration, 172);
  doc.text(wrappedDecl, 19, currentY + 4.5);

  // 8. DOUBLE SIGNATURES
  currentY += 24;
  
  // Left Block
  doc.rect(15, currentY, 86, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("L'INFORMATICIEN INTERVENANT", 18, currentY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("CNIPLC Service de Maintenance", 18, currentY + 8);
  doc.line(15, currentY + 16, 101, currentY + 16);
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 17, currentY + 20);
  doc.text("Signature", 99, currentY + 20, { align: "right" });

  // Right Block
  doc.rect(109, currentY, 86, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("LE BÉNÉFICIAIRE / DIRECTEUR", 112, currentY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(intervention.clientName, 112, currentY + 8);
  doc.line(109, currentY + 16, 195, currentY + 16);
  doc.text("Date : ___ / ___ / ______", 111, currentY + 20);
  doc.text("Prestation Validée", 193, currentY + 20, { align: "right" });

  // Clean save action
  const pdfFileName = `CNIPLC_Fiche_${intervention.refNumber.replace(/\s+/g, "_")}.pdf`;
  doc.save(pdfFileName);
}

export async function generateAndDownloadPhotosPDF(intervention: Intervention): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Get official base64 logo
  const imgData = await getBase64ImageFromUrl("/logo.jpeg");

  const currentY = 15;

  // Header Section (identical to main PDF for administrative authenticity)
  if (imgData) {
    doc.addImage(imgData, "JPEG", 15, currentY, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("RÉPUBLIQUE DE DJIBOUTI", 38, currentY + 3);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const headerLines = doc.splitTextToSize("COMMISSION NATIONALE INDÉPENDANTE POUR LA PRÉVENTION ET LA LUTTE CONTRE LA CORRUPTION", 100);
    doc.text(headerLines, 38, currentY + 7);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(197, 160, 67);
    doc.text("CNIPLC - SERVICES TECHNIQUES DE L'INFORMATIQUE", 38, currentY + 16);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("RÉPUBLIQUE DE DJIBOUTI", 15, currentY + 3);
    doc.setFontSize(8);
    const headerLines = doc.splitTextToSize("COMMISSION NATIONALE INDÉPENDANTE POUR LA PRÉVENTION ET LA LUTTE CONTRE LA CORRUPTION", 120);
    doc.text(headerLines, 15, currentY + 8);
    doc.setFontSize(8);
    doc.setTextColor(197, 160, 67);
    doc.text("CNIPLC - SERVICES TECHNIQUES DE L'INFORMATIQUE", 15, currentY + 18);
  }

  // Metadata block (Right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`REF : ${intervention.refNumber}`, 195, currentY + 4, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Photos : ${intervention.photos?.length || 0} clichés`, 195, currentY + 9, { align: "right" });
  doc.text(`Date : ${new Date(intervention.date).toLocaleDateString('fr-FR')}`, 195, currentY + 14, { align: "right" });

  doc.setDrawColor(197, 160, 67);
  doc.setLineWidth(0.8);
  doc.line(15, currentY + 23, 195, currentY + 23);

  // Photo Section Core Title
  const titleY = currentY + 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("ALBUM PHOTO ET PREUVES MATÉRIELLES D'INTERVENTION", 105, titleY, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(197, 160, 67);
  doc.text("ANNEXE TECHNIQUE DE CLÔTURE DE PRESTATION", 105, titleY + 4.5, { align: "center" });

  const photos = intervention.photos || [];
  const count = photos.length;

  if (count === 0) {
    // Empty state fallback
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, titleY + 15, 180, 50);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Aucune photo consignée pour cette intervention.", 105, titleY + 42, { align: "center" });
  } else {
    // Smart and Clear Grid Layout rendering beautifully inside a single A4 page
    const startPhotoY = titleY + 12;

    if (count === 1) {
      // 1 Giant Block / Cube
      const photo = photos[0];
      const imgWidth = 150;
      const imgHeight = 110;
      const startX = 30;
      const startY = startPhotoY + 10;

      try {
        doc.addImage(photo.url, "JPEG", startX, startY, imgWidth, imgHeight);
      } catch {
        doc.setFillColor(240, 240, 240);
        doc.rect(startX, startY, imgWidth, imgHeight, "F");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("[Image non valide ou format incompatible]", startX + 45, startY + 55);
      }

      // Elegant caption border box
      doc.setFillColor(253, 250, 242);
      doc.rect(startX, startY + imgHeight, imgWidth, 18, "F");
      doc.setDrawColor(242, 223, 174);
      doc.setLineWidth(0.3);
      doc.rect(startX, startY + imgHeight, imgWidth, 18, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(147, 113, 35);
      doc.text("CLICHÉ N°1 :", startX + 5, startY + imgHeight + 11);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      const wrappedDesc = doc.splitTextToSize(photo.taskDescription || "Aucun commentaire technique consigné.", imgWidth - 32);
      doc.text(wrappedDesc, startX + 27, startY + imgHeight + 10.5);

    } else if (count === 2) {
      // 2 Side by side elegant blocks (cubes)
      const imgWidth = 84;
      const imgHeight = 84;
      const startY = startPhotoY + 20;

      photos.forEach((photo, idx) => {
        const startX = idx === 0 ? 15 : 111;
        try {
          doc.addImage(photo.url, "JPEG", startX, startY, imgWidth, imgHeight);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.rect(startX, startY, imgWidth, imgHeight, "F");
        }

        // Caption Box
        doc.setFillColor(253, 250, 242);
        doc.rect(startX, startY + imgHeight, imgWidth, 18, "F");
        doc.setDrawColor(242, 223, 174);
        doc.rect(startX, startY + imgHeight, imgWidth, 18, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(147, 113, 35);
        doc.text(`CLICHÉ N°${idx + 1} :`, startX + 4, startY + imgHeight + 11);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const wrappedDesc = doc.splitTextToSize(photo.taskDescription || "Aucune consigne.", imgWidth - 24);
        doc.text(wrappedDesc, startX + 22, startY + imgHeight + 10.5);
      });

    } else if (count === 3) {
      // Asymmetric Smart Layout: 1 primary block on top, 2 side-by-side blocks below
      // Top Block
      const primaryPhoto = photos[0];
      const primaryWidth = 150;
      const primaryHeight = 85;
      const primaryX = 30;
      const primaryY = startPhotoY + 5;

      try {
        doc.addImage(primaryPhoto.url, "JPEG", primaryX, primaryY, primaryWidth, primaryHeight);
      } catch {
        doc.setFillColor(240, 240, 240);
        doc.rect(primaryX, primaryY, primaryWidth, primaryHeight, "F");
      }

      doc.setFillColor(253, 250, 242);
      doc.rect(primaryX, primaryY + primaryHeight, primaryWidth, 14, "F");
      doc.setDrawColor(242, 223, 174);
      doc.rect(primaryX, primaryY + primaryHeight, primaryWidth, 14, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(147, 113, 35);
      doc.text("CLICHÉ MAJEUR (N°1) :", primaryX + 4, primaryY + primaryHeight + 9);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const wrappedDescPrimary = doc.splitTextToSize(primaryPhoto.taskDescription || "Preuve technique principale.", primaryWidth - 40);
      doc.text(wrappedDescPrimary, primaryX + 37, primaryY + primaryHeight + 8.5);

      // Remaining 2 below side by side
      const remainingPhotos = photos.slice(1, 3);
      const secWidth = 84;
      const secHeight = 58;
      const secY = primaryY + primaryHeight + 23;

      remainingPhotos.forEach((photo, idx) => {
        const startX = idx === 0 ? 15 : 111;
        try {
          doc.addImage(photo.url, "JPEG", startX, secY, secWidth, secHeight);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.rect(startX, secY, secWidth, secHeight, "F");
        }

        doc.setFillColor(253, 250, 242);
        doc.rect(startX, secY + secHeight, secWidth, 13, "F");
        doc.setDrawColor(242, 223, 174);
        doc.rect(startX, secY + secHeight, secWidth, 13, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(147, 113, 35);
        doc.text(`CLICHÉ N°${idx + 2} :`, startX + 4, secY + secHeight + 8);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        const wrappedDesc = doc.splitTextToSize(photo.taskDescription || "Aucune observation.", secWidth - 22);
        doc.text(wrappedDesc, startX + 20, secY + secHeight + 7.5);
      });

    } else if (count === 4) {
      // Perfect 2x2 grid (Four smart block cubes)
      const imgWidth = 84;
      const imgHeight = 65;
      const rowGap = 12;

      photos.forEach((photo, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);

        const startX = col === 0 ? 15 : 111;
        const startY = startPhotoY + 10 + row * (imgHeight + rowGap + 12);

        try {
          doc.addImage(photo.url, "JPEG", startX, startY, imgWidth, imgHeight);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.rect(startX, startY, imgWidth, imgHeight, "F");
        }

        doc.setFillColor(253, 250, 242);
        doc.rect(startX, startY + imgHeight, imgWidth, 13, "F");
        doc.setDrawColor(242, 223, 174);
        doc.rect(startX, startY + imgHeight, imgWidth, 13, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(147, 113, 35);
        doc.text(`CLICHÉ N°${idx + 1} :`, startX + 4, startY + imgHeight + 8);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        const wrappedDesc = doc.splitTextToSize(photo.taskDescription || "Aucune observation rédigée.", imgWidth - 22);
        doc.text(wrappedDesc, startX + 20, startY + imgHeight + 8);
      });

    } else if (count === 5) {
      // 5 photos - "خمس صور على شكل كولاج"
      // Smart mosaic collage: ROW 1 has 2 larger horizontal blocks; ROW 2 has 3 beautifully aligned cubes!
      // Row 1 (2 blocks of Width 86mm, Height 64mm)
      const row1Width = 86;
      const row1Height = 64;
      const row1Y = startPhotoY + 5;

      for (let i = 0; i < 2; i++) {
        const photo = photos[i];
        const startX = i === 0 ? 15 : 109;

        try {
          doc.addImage(photo.url, "JPEG", startX, row1Y, row1Width, row1Height);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.rect(startX, row1Y, row1Width, row1Height, "F");
        }

        // Caption Bar
        doc.setFillColor(253, 250, 242);
        doc.rect(startX, row1Y + row1Height, row1Width, 13, "F");
        doc.setDrawColor(242, 223, 174);
        doc.rect(startX, row1Y + row1Height, row1Width, 13, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(147, 113, 35);
        doc.text(`CLICHÉ N°${i + 1} :`, startX + 4, row1Y + row1Height + 8);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        const wrappedDesc = doc.splitTextToSize(photo.taskDescription || "Opération technique constatée.", row1Width - 22);
        doc.text(wrappedDesc, startX + 20, row1Y + row1Height + 8);
      }

      // Row 2 (3 elegant small blocks / cubes of Width 55mm, Height 52mm)
      const row2Width = 55;
      const row2Height = 52;
      const row2Y = row1Y + row1Height + 25; // 25mm spacing to include row 1 captions + vertical gap

      for (let i = 2; i < 5; i++) {
        const photo = photos[i];
        // Distribute nicely across margins 15mm up to 195mm (printable width of 180mm)
        // Col 1: X = 15mm. Col 2: X = 77.5mm. Col 3: X = 140mm.
        let startX = 15;
        if (i === 3) startX = 77.5;
        if (i === 4) startX = 140;

        try {
          doc.addImage(photo.url, "JPEG", startX, row2Y, row2Width, row2Height);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.rect(startX, row2Y, row2Width, row2Height, "F");
        }

        // Caption Bar
        doc.setFillColor(253, 250, 242);
        doc.rect(startX, row2Y + row2Height, row2Width, 13, "F");
        doc.setDrawColor(242, 223, 174);
        doc.rect(startX, row2Y + row2Height, row2Width, 13, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(147, 113, 35);
        doc.text(`CLICHÉ N°${i + 1} :`, startX + 3, row2Y + row2Height + 8);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(60, 60, 60);
        const wrappedDesc = doc.splitTextToSize(photo.taskDescription || "Acte achevé.", row2Width - 16);
        doc.text(wrappedDesc, startX + 17, row2Y + row2Height + 7.5);
      }

    } else {
      // 6 photos - Perfectly ordered 2x3 block grid (6 cubes)
      const imgWidth = 84;
      const imgHeight = 48;
      const rowGap = 13;

      photos.forEach((photo, idx) => {
        if (idx >= 6) return; // strict cap at 6 photos
        const col = idx % 2;
        const row = Math.floor(idx / 2);

        const startX = col === 0 ? 15 : 111;
        const startY = startPhotoY + 5 + row * (imgHeight + rowGap + 12);

        try {
          doc.addImage(photo.url, "JPEG", startX, startY, imgWidth, imgHeight);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.rect(startX, startY, imgWidth, imgHeight, "F");
        }

        // Caption Box
        doc.setFillColor(253, 250, 242);
        doc.rect(startX, startY + imgHeight, imgWidth, 12, "F");
        doc.setDrawColor(242, 223, 174);
        doc.rect(startX, startY + imgHeight, imgWidth, 12, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(147, 113, 35);
        doc.text(`CLICHÉ N°${idx + 1} :`, startX + 4, startY + imgHeight + 7.5);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        const wrappedDesc = doc.splitTextToSize(photo.taskDescription || "Observation technique.", imgWidth - 22);
        doc.text(wrappedDesc, startX + 20, startY + imgHeight + 7.5);
      });
    }
  }

  // Save the Photos PDF
  const photosPdfFileName = `CNIPLC_Fiche_Photos_${intervention.refNumber.replace(/\s+/g, "_")}.pdf`;
  doc.save(photosPdfFileName);
}

export async function generateConsolidatedReportPDF(interventions: Intervention[]): Promise<void> {
  if (interventions.length === 0) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const logoImgData = await getBase64ImageFromUrl("/logo.jpeg");

  const totalPagesEstimate = Math.ceil(interventions.length / 2) + 2;

  // Helper to draw headers
  const drawPageHeader = (pageNum: number) => {
    let currentY = 15;
    if (logoImgData) {
      doc.addImage(logoImgData, "JPEG", 15, currentY, 18, 18);
      // State Text with indentation
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text("RÉPUBLIQUE DE DJIBOUTI", 36, currentY + 3);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42); // Slate-900
      const headerLines = doc.splitTextToSize("COMMISSION NATIONALE INDÉPENDANTE POUR LA PRÉVENTION ET LA LUTTE CONTRE LA CORRUPTION", 100);
      doc.text(headerLines, 36, currentY + 6);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(197, 160, 67); // Gold-500
      doc.text("CNIPLC - SERVICES TECHNIQUES DE L'INFORMATIQUE", 36, currentY + 14);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("RÉPUBLIQUE DE DJIBOUTI", 15, currentY + 3);
      
      doc.setFontSize(7);
      const headerLines = doc.splitTextToSize("COMMISSION NATIONALE INDÉPENDANTE POUR LA PRÉVENTION ET LA LUTTE CONTRE LA CORRUPTION", 120);
      doc.text(headerLines, 15, currentY + 7);
      
      doc.setFontSize(7.5);
      doc.setTextColor(197, 160, 67);
      doc.text("CNIPLC - SERVICES TECHNIQUES DE L'INFORMATIQUE", 15, currentY + 15);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("RAPPORT CONSOLIDÉ D'ACTIVITÉ", 195, currentY + 4, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 195, currentY + 9, { align: "right" });
    doc.text(`Fiches compilées : ${interventions.length}`, 195, currentY + 13, { align: "right" });

    doc.setDrawColor(197, 160, 67); // Gold
    doc.setLineWidth(0.5);
    doc.line(15, currentY + 20, 195, currentY + 20);
  };

  const drawPageFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.line(15, 280, 195, 280);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("RAPPORT MENSUEL CONSOLIDÉ CNIPLC - REPUBLIQUE DE DJIBOUTI", 15, 285);
    doc.text(`Page ${pageNum} / ${totalPages}`, 195, 285, { align: "right" });
  };

  // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
  drawPageHeader(1);
  
  let currentY = 50;
  
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 180, 35, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(15, currentY, 180, 35, "D");

  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("RAPPORT MENSUEL D'ACTIVITÉS INFORMATIQUES", 105, currentY, { align: "center" });

  currentY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(197, 160, 67);
  doc.text("CONSOLIDATION DES FICHES D'INTERVENTIONS TECHNIQUES ET SERVICE FAIT", 105, currentY, { align: "center" });

  currentY += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const dates = interventions.map(i => i.date).sort();
  const minDate = dates[0] ? new Date(dates[0]).toLocaleDateString('fr-FR') : '';
  const maxDate = dates[dates.length - 1] ? new Date(dates[dates.length - 1]).toLocaleDateString('fr-FR') : '';
  doc.text(`Période couverte : Du ${minDate} au ${maxDate}`, 105, currentY, { align: "center" });

  currentY += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("1. TABLEAU DE SYNTHÈSE DES STATISTIQUES", 15, currentY);

  currentY += 5;
  doc.setFillColor(253, 250, 242);
  doc.roundedRect(15, currentY, 180, 20, 2, 2, "F");
  doc.setDrawColor(242, 223, 174);
  doc.roundedRect(15, currentY, 180, 20, 2, 2, "D");

  const totalInterventions = interventions.length;
  const completedCount = interventions.filter(i => i.status === "termine").length;
  const pendingCount = totalInterventions - completedCount;
  const totalDuration = interventions.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL PRESTATIONS", 25, currentY + 7);
  doc.text("ARCHIVÉES & PRÊTES", 75, currentY + 7);
  doc.text("EN RECOUVREMENT", 120, currentY + 7);
  doc.text("TEMPS DE ROUTINE", 160, currentY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalInterventions}`, 25, currentY + 15);
  doc.setTextColor(16, 124, 65);
  doc.text(`${completedCount}`, 75, currentY + 15);
  doc.setTextColor(197, 160, 67);
  doc.text(`${pendingCount}`, 120, currentY + 15);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalDuration} min`, 160, currentY + 15);

  currentY += 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("2. REGISTRE RÉCAPITULATIF DES ARCHIVES COMPILÉES", 15, currentY);

  currentY += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, currentY, 180, 7, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text("RÉFÉRENCE", 17, currentY + 5);
  doc.text("DATE", 46, currentY + 5);
  doc.text("BÉNÉFICIAIRE", 68, currentY + 5);
  doc.text("DÉPARTEMENT / SERVICE", 110, currentY + 5);
  doc.text("MATÉRIEL", 158, currentY + 5);
  doc.text("STATUT", 181, currentY + 5);

  currentY += 7;

  interventions.forEach((item, index) => {
    if (currentY > 260) {
      drawPageFooter(doc.getNumberOfPages(), totalPagesEstimate);
      doc.addPage();
      drawPageHeader(doc.getNumberOfPages());
      currentY = 40;
      
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 7, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, currentY, 180, 7, "D");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text("RÉFÉRENCE", 17, currentY + 5);
      doc.text("DATE", 46, currentY + 5);
      doc.text("BÉNÉFICIAIRE", 68, currentY + 5);
      doc.text("DÉPARTEMENT / SERVICE", 110, currentY + 5);
      doc.text("MATÉRIEL", 158, currentY + 5);
      doc.text("STATUT", 181, currentY + 5);
      
      currentY += 7;
    }

    doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 251, index % 2 === 0 ? 255 : 253);
    doc.rect(15, currentY, 180, 8, "F");
    doc.setDrawColor(241, 245, 249);
    doc.rect(15, currentY, 180, 8, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(item.refNumber, 17, currentY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(new Date(item.date).toLocaleDateString('fr-FR'), 46, currentY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.text(item.clientName.substring(0, 20), 68, currentY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.text(item.clientDepartment.substring(0, 22), 110, currentY + 5.5);
    doc.text(item.deviceType.substring(0, 15), 158, currentY + 5.5);

    if (item.status === "termine") {
      doc.setTextColor(16, 124, 65);
      doc.setFont("helvetica", "bold");
      doc.text("TERMINÉ", 181, currentY + 5.5);
    } else {
      doc.setTextColor(197, 160, 67);
      doc.setFont("helvetica", "bold");
      doc.text("EN COURS", 181, currentY + 5.5);
    }

    currentY += 8;
  });

  drawPageFooter(doc.getNumberOfPages(), totalPagesEstimate);

  // --- PAGES DETALLES (2 par page max) ---
  interventions.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.addPage();
      drawPageHeader(doc.getNumberOfPages());
      currentY = 40;
    } else {
      currentY = 155;
    }

    // Border Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, currentY, 180, 105, 2, 2, "D");

    // Title box
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(15, currentY, 180, 8, 2, 2, "F");
    doc.rect(15, currentY + 4, 180, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`INTERVENTION N°${index + 1} : COMPTE RENDU TECHNIQUE (Réf ${item.refNumber})`, 20, currentY + 5.5);

    doc.setTextColor(15, 23, 42);
    let boxY = currentY + 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("BÉNÉFICIAIRE ADMINISTRATIF", 20, boxY);
    doc.text("MATÉRIEL ET ÉQUIPEMENT", 110, boxY);

    boxY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nom : ${item.clientName}`, 20, boxY);
    doc.text(`Type : ${item.deviceType}`, 110, boxY);

    boxY += 3.5;
    doc.text(`Fonction : ${item.clientTitle}`, 20, boxY);
    doc.text(`Marque : ${item.deviceBrand || "Standard"}`, 110, boxY);

    boxY += 3.5;
    doc.text(`Service : ${item.clientDepartment}`, 20, boxY);
    doc.text(`Date d'exécution : ${new Date(item.date).toLocaleDateString('fr-FR')}`, 110, boxY);

    boxY += 4;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(17, boxY, 193, boxY);

    boxY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("SYNTHÈSE ADMINISTRATIVE DU SERVICE CONSTATÉ", 20, boxY);

    boxY += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(item.professionalSummary || "Aucune synthèse.", 172);
    doc.text(summaryLines, 20, boxY);
    
    boxY += (summaryLines.length * 3) + 2;
    doc.setDrawColor(241, 245, 249);
    doc.line(17, boxY, 193, boxY);

    boxY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("ACTES TECHNIQUES DE MAINTENANCE EFFECTUÉS", 20, boxY);

    boxY += 3.5;
    const maxTasks = item.tasks.slice(0, 3);
    maxTasks.forEach((task) => {
      doc.setFillColor(197, 160, 67);
      doc.circle(21, boxY + 0.8, 0.6, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const tText = doc.splitTextToSize(task.description, 130);
      doc.text(tText, 25, boxY + 1.2);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(162, boxY - 1, 27, 3.5, 0.5, 0.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(task.category, 175, boxY + 1.2, { align: "center" });

      boxY += (tText.length * 2.8) + 1.2;
    });

    if (item.tasks.length > 3) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`... et ${item.tasks.length - 3} autres actions techniques complémentaires archivées.`, 25, boxY + 0.5);
    }

    if (index % 2 === 1 || index === interventions.length - 1) {
      drawPageFooter(doc.getNumberOfPages(), totalPagesEstimate);
    }
  });

  // --- DERNIERE PAGE: CLASSIFICATION ET APPROBATIONS ---
  doc.addPage();
  drawPageHeader(doc.getNumberOfPages());
  currentY = 45;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("3. RAPPORT D'APPROBATION SOUVERAIN (CNIPLC)", 15, currentY);

  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const concludeLines = doc.splitTextToSize(
    "Le présent document d'Etat sert d'archive administrative officielle consolidant l'ensemble des interventions techniques, " +
    "de maintenance système et de déploiement réseau conduites d'office par nos services habilités auprès des directions " +
    "et agents d'Etat de la République de Djibouti. Le bon fonctionnement, la continuité logicielle et matérielle sont certifiés.", 180
  );
  doc.text(concludeLines, 15, currentY);

  currentY += 25;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, currentY, 195, currentY);

  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("LE TECHNICIEN DES SERVICES", 15, currentY);
  doc.text("LE DIRECTEUR GENERAL DU CNIPLC", 105, currentY);

  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Nom complet : _________________________", 15, currentY);
  doc.text("Nom complet : _________________________", 105, currentY);

  currentY += 5;
  doc.text("Signature et datation :", 15, currentY);
  doc.text("Signature et datation :", 105, currentY);

  currentY += 15;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.1);
  doc.line(15, currentY + 10, 80, currentY + 10);
  doc.line(105, currentY + 10, 170, currentY + 10);

  drawPageFooter(doc.getNumberOfPages(), totalPagesEstimate);

  const consolidatedPdfFileName = `CNIPLC_Rapport_Consolide_Activite_${new Date().toISOString().substring(0, 10)}.pdf`;
  doc.save(consolidatedPdfFileName);
}

export function generateAutoCleanupReportPDF(interventions: Intervention[]) {
  // Wraps the consolidated report function for the auto-cleanup feature
  generateConsolidatedReportPDF(interventions);
}
