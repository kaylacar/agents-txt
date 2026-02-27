# IANA Well-Known URI Registration Submission

## How to Submit

Go to: https://www.iana.org/form/well-known-uri

Submit the following registrations (one per form submission).

---

## Registration 1: agents.txt

**URI suffix:** agents.txt

**Change controller:** Kayla Car <kayla@agents-txt.dev>

**Specification document(s):**
https://github.com/kaylacar/agents-txt/blob/master/SPEC.md

**Related information:**
Text-format capability declaration file for AI agent discovery.
Allows website operators to declare which actions AI agents may
perform on their site, which endpoints and protocols are available,
authentication requirements, and rate limits. Complementary to
robots.txt (which declares restrictions); agents.txt declares
explicitly permitted capabilities.

---

## Registration 2: agents.json

**URI suffix:** agents.json

**Change controller:** Kayla Car <kayla@agents-txt.dev>

**Specification document(s):**
https://github.com/kaylacar/agents-txt/blob/master/SPEC.md

**Related information:**
JSON-format companion to agents.txt. Contains equivalent capability
declaration information in a typed JSON structure for programmatic
consumption. Served at /.well-known/agents.json alongside the text
format.

---

## After Submitting to IANA

The submission triggers an expert review process. A designated
reviewer will evaluate whether the specification is sufficiently
stable and the use case is legitimate. This is not a vote — it is
a review for basic completeness and non-conflict with existing URIs.

To strengthen the submission:

1. Submit the Internet-Draft to the IETF datatracker at:
   https://datatracker.ietf.org/submit/
   (requires creating an IETF Datatracker account)

2. Post to the "apps-discuss" IETF mailing list to notify the
   Applications area about the registration:
   https://www.ietf.org/mailman/listinfo/apps-discuss

3. Keep the specification document at a stable, publicly accessible URL.
   The GitHub URL above is acceptable; a dedicated domain is better.
