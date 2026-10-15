import { describe, expect, it } from 'vitest';

import { checklistResult, cleanTrusted, normalize, scamRisk, scamSigns, telHref } from '../src/domain/scam';

describe('señales de estafa en un mensaje', () => {
  it('detecta el «hijo en apuros» por WhatsApp', () => {
    const s = scamSigns('Hola mamá, se me ha roto el móvil y este es mi nuevo número. Necesito que me hagas un Bizum urgente de 480 €');
    expect(s).toEqual(expect.arrayContaining(['newNumber', 'family', 'urgent', 'money']));
    expect(scamRisk(s)).toBe('high');
  });

  it('detecta el SMS falso del banco con enlace y código', () => {
    const s = scamSigns('BBVA: Hemos detectado un acceso no autorizado a su cuenta. Verifique sus datos en https://bbva-seguro.top y facilite el CÓDIGO recibido');
    expect(s).toEqual(expect.arrayContaining(['code', 'bank', 'link']));
    expect(scamRisk(s)).toBe('high');
  });

  it('detecta la tasa falsa de un paquete', () => {
    const s = scamSigns('Correos: su paquete está retenido. Pague 1,99 € de tasa de aduana en correos-envio.com antes de 24 horas');
    expect(s).toEqual(expect.arrayContaining(['delivery', 'link', 'urgent']));
  });

  it('detecta inversiones y premios milagro', () => {
    expect(scamSigns('Invierte en bitcoin con beneficios garantizados')).toContain('investment');
    expect(scamSigns('¡Enhorabuena! Has ganado un iPhone en nuestro sorteo')).toContain('prize');
  });

  it('no ve nada en un mensaje normal', () => {
    const s = scamSigns('¿Quedamos mañana a las 8 para cenar?');
    expect(s).toEqual([]);
    expect(scamRisk(s)).toBe('none');
    expect(scamSigns('')).toEqual([]);
  });

  it('da igual mayúsculas y tildes, y no confunde palabras parecidas', () => {
    expect(normalize('CÓDIGO Mamá')).toBe('codigo mama');
    expect(scamSigns('dime el codigo')).toEqual(['code']);
    expect(scamSigns('vamos a pintar la casa')).toEqual([]);
    expect(scamSigns('Son las 8, ¿para cuándo la cena?')).toEqual([]);
    expect(scamRisk(['prize'])).toBe('some');
  });
});

describe('lista de preguntas', () => {
  it('un solo sí basta para parar', () => {
    expect(checklistResult([false, true, undefined, undefined], 4)).toBe('stop');
  });
  it('todo no: parece normal; si falta alguna, aún no se sabe', () => {
    expect(checklistResult([false, false, false, false], 4)).toBe('ok');
    expect(checklistResult([false, false, undefined, false], 4)).toBe('pending');
    expect(checklistResult([], 4)).toBe('pending');
  });
});

describe('persona de confianza', () => {
  it('arma el enlace para llamar', () => {
    expect(telHref('+34 600 11 22 33')).toBe('tel:+34600112233');
    expect(telHref('600-112-233')).toBe('tel:600112233');
    expect(telHref('ab')).toBeNull();
  });
  it('solo guarda con nombre y teléfono', () => {
    expect(cleanTrusted('  Laura  ', '600 112 233')).toEqual({ name: 'Laura', phone: '600 112 233' });
    expect(cleanTrusted('', '600112233')).toBeNull();
    expect(cleanTrusted('Laura', '')).toBeNull();
  });
});
