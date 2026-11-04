# ZannyChat 1.2.176

Status deletion now fails safely when validated media cleanup fails: the app retains the status row and tells the user they can retry. Owner scoping and safe media-path validation remain required. Regression tests guard cleanup ordering.

Validation is recorded in the release handoff; no live deployment is claimed.
