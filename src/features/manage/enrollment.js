/**
 * Joining choices a circle may offer (the API enforces the same rules):
 *  - independent circles are public: open, or by the Sheikh's approval;
 *  - private institutions place students themselves: invitation or closed;
 *  - free institutions: open, approval, or invitation.
 * A public circle that should stop taking students is paused instead.
 */
export function enrollmentChoices(institution) {
  if (!institution) return ['open', 'approval_required'];
  return institution.kind === 'private_paid' ? ['invite_only', 'closed'] : ['open', 'approval_required', 'invite_only'];
}
