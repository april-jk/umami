import fs from 'node:fs';
import path from 'node:path';

const messagesDirectory = path.resolve('public/intl/messages');
const sourceLocale = 'en-US';
const expectedPlans = {
  free: 9,
  starter: 8,
  pro: 9,
  team: 7,
  enterprise: 6,
};

function readMessages(locale) {
  const file = path.join(messagesDirectory, `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readMembership(locale) {
  return readMessages(locale).membership;
}

function getShape(value) {
  if (Array.isArray(value)) {
    return value.map(getShape);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, getShape(value[key])]),
    );
  }

  return typeof value;
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
  } else if (Array.isArray(value)) {
    value.forEach(child => {
      collectStrings(child, output);
    });
  } else if (value && typeof value === 'object') {
    Object.keys(value)
      .sort()
      .forEach(key => {
        collectStrings(value[key], output);
      });
  }

  return output;
}

const locales = fs
  .readdirSync(messagesDirectory)
  .filter(file => file.endsWith('.json'))
  .map(file => path.basename(file, '.json'))
  .sort();
const source = readMembership(sourceLocale);
const sourceShape = JSON.stringify(getShape(source));
const sourceStrings = collectStrings(source);
const errors = [];

if (locales.length !== 52) {
  errors.push(`expected 52 locale files, found ${locales.length}`);
}

for (const locale of locales) {
  const messages = readMessages(locale);
  const { membership } = messages;

  if (!membership) {
    errors.push(`${locale}: missing membership messages`);
    continue;
  }

  if (!messages.label?.membership?.trim()) {
    errors.push(`${locale}: missing label.membership translation`);
  } else if (!['en-US', 'en-GB'].includes(locale) && messages.label.membership === 'Membership') {
    errors.push(`${locale}: label.membership still matches English`);
  }

  if (JSON.stringify(getShape(membership)) !== sourceShape) {
    errors.push(`${locale}: membership message structure differs from ${sourceLocale}`);
  }

  for (const [plan, featureCount] of Object.entries(expectedPlans)) {
    if (membership.plans?.[plan]?.features?.length !== featureCount) {
      errors.push(`${locale}: ${plan} must contain ${featureCount} features`);
    }
  }

  for (const [key, placeholder] of [
    ['pricePerMonth', 'price'],
    ['billedYear', 'price'],
    ['yearAvailable', 'price'],
    ['retentionDays', 'count'],
    ['planLabel', 'plan'],
  ]) {
    const matches = membership[key]?.match(new RegExp(`\\{${placeholder}\\}`, 'g')) ?? [];
    if (matches.length !== 1) {
      errors.push(`${locale}: membership.${key} must contain {${placeholder}} exactly once`);
    }
  }

  const strings = collectStrings(membership);
  if (strings.some(value => value.trim().length === 0)) {
    errors.push(`${locale}: membership contains an empty translation`);
  }

  if (!['en-US', 'en-GB'].includes(locale)) {
    const identicalCount = strings.filter((value, index) => value === sourceStrings[index]).length;
    const identicalRatio = identicalCount / sourceStrings.length;

    if (identicalRatio > 0.35) {
      errors.push(
        `${locale}: ${Math.round(identicalRatio * 100)}% of membership strings still match English`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated membership translations for ${locales.length} locales.`);
