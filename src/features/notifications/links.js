/** Where a notification leads, from the ids in its payload (never from free text). Mirrors the API's push links. */
export function targetOf(n) {
  const p = n.payload ?? {};
  if (p.sessionId && !n.kind.startsWith('revision.')) return `/sessions/${p.sessionId}`;
  if (p.circleId) return `/circles/${p.circleId}`;
  if (n.kind === 'application.submitted' || n.kind === 'institution.submitted' || n.kind === 'main_circle.submitted') return '/admin';
  if (p.applicationId) return `/apply/${p.applicationId}`;
  if (n.kind === 'invitation.received') return '/circles';
  if (p.institutionId) return `/institutions/${p.institutionId}`;
  if (p.mainCircleId) return `/main-circles/${p.mainCircleId}`;
  if (n.kind.startsWith('billing.')) return '/manage';
  return null;
}
