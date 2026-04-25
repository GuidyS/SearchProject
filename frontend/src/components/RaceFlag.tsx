import arFlag from "@/assets/flags/ar.png";
import atFlag from "@/assets/flags/at.png";
import auFlag from "@/assets/flags/au.png";
import azFlag from "@/assets/flags/az.png";
import beFlag from "@/assets/flags/be.png";
import bhFlag from "@/assets/flags/bh.png";
import brFlag from "@/assets/flags/br.png";
import caFlag from "@/assets/flags/ca.png";
import cnFlag from "@/assets/flags/cn.png";
import deFlag from "@/assets/flags/de.png";
import esFlag from "@/assets/flags/es.png";
import fiFlag from "@/assets/flags/fi.png";
import frFlag from "@/assets/flags/fr.png";
import gbFlag from "@/assets/flags/gb.png";
import huFlag from "@/assets/flags/hu.png";
import itFlag from "@/assets/flags/it.png";
import jpFlag from "@/assets/flags/jp.png";
import mcFlag from "@/assets/flags/mc.png";
import mxFlag from "@/assets/flags/mx.png";
import nlFlag from "@/assets/flags/nl.png";
import nzFlag from "@/assets/flags/nz.png";
import qaFlag from "@/assets/flags/qa.png";
import saFlag from "@/assets/flags/sa.png";
import sgFlag from "@/assets/flags/sg.png";
import thFlag from "@/assets/flags/th.png";
import usFlag from "@/assets/flags/us.png";
import aeFlag from "@/assets/flags/ae.png";

const flagImages: Record<string, string> = {
  ar: arFlag,
  at: atFlag,
  au: auFlag,
  az: azFlag,
  be: beFlag,
  bh: bhFlag,
  br: brFlag,
  ca: caFlag,
  cn: cnFlag,
  de: deFlag,
  es: esFlag,
  fi: fiFlag,
  fr: frFlag,
  gb: gbFlag,
  hu: huFlag,
  it: itFlag,
  jp: jpFlag,
  mc: mcFlag,
  mx: mxFlag,
  nl: nlFlag,
  nz: nzFlag,
  qa: qaFlag,
  sa: saFlag,
  sg: sgFlag,
  th: thFlag,
  us: usFlag,
  ae: aeFlag,
};

interface RaceFlagProps {
  flag: string;
  flagImg?: string;
  className?: string;
}

const RaceFlag = ({ flag, flagImg, className = "text-2xl" }: RaceFlagProps) => {
  if (flagImg && flagImages[flagImg]) {
    return <img src={flagImages[flagImg]} alt={flag} className={`h-[18px] w-[27px] object-cover rounded-[2px] ${className}`} />;
  }
  return <span className={className}>{flag}</span>;
};

export default RaceFlag;
