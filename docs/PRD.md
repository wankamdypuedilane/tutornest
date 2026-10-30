# TutorNest: Product Requirements Document

Version 1.0 - Owner: product team, Northlight Learning (fictional) - Status: approved for MVP

## 1. Problem

Northlight Learning runs a network of about 120 volunteer and paid mentors who
help adults retrain into tech jobs. Today, learners find mentors through a
spreadsheet, book sessions by e-mail, and meet on whatever video tool the mentor
prefers. Coordinators spend about 10 hours a week matching people and chasing
no-shows, and learners often wait more than a week for a first session.

## 2. Goal and success metrics

Give learners a self-service way to find a suitable mentor and book a session in
minutes, and give mentors control over their availability.

| Metric | Today | Target 3 months after launch |
|---|---|---|
| Time from sign-up to first booked session | 8 days (median) | under 2 days |
| Coordinator time spent on scheduling | 10 h/week | under 2 h/week |
| Sessions with a no-show | 18% | under 8% (thanks to reminders) |

## 3. Users and personas

**Learner - "Inès", 29, career changer.** Works full time in retail, studies web
development in the evenings. Needs a mentor who knows the junior job market,
sessions in the evening, and a clear record of goals and progress. Uses a phone
more than a laptop.

**Mentor - "Marc", 41, senior developer.** Mentors two to four hours a month.
Wants to publish availability once, avoid back-and-forth e-mails, and never be
double-booked. Cares about privacy: does not want to share a personal phone
number or e-mail address.

**Coordinator - "Aïcha", 35, Northlight staff.** Approves new mentors, watches
for problems and needs simple statistics.

## 4. Scope of the MVP

In scope:
1. Accounts with e-mail/password and Google sign-in; roles learner, mentor, admin.
2. Public mentor directory with search by skill and language; public mentor profiles.
3. Profiles with avatar, headline, bio, skills, languages and time zone.
4. Mentor availability (weekly recurring slots) and session booking by learners.
5. In-app video sessions (LiveKit) that only the two participants can join.
6. Transactional e-mails: welcome, booking confirmation, reminder 24 h before, cancellation.
7. Learner goals: a short list of goals with a status.
8. Settings: notification preferences, theme, account deletion.

Out of scope for the MVP: payments (mentoring is free for learners in the
pilot), group sessions, chat between sessions, mobile apps, ratings.

## 5. Functional requirements and user stories

FR-1 Accounts
- As a visitor, I want to create an account with my e-mail or Google account so that I can book sessions.
- As a user, I want to sign out on any device so that my account stays private on shared computers.

FR-2 Directory and profiles
- As a learner, I want to filter mentors by skill and language so that I find relevant people quickly.
- As a mentor, I want to edit my public profile so that learners understand how I can help.

FR-3 Availability and booking
- As a mentor, I want to define weekly availability in my own time zone so that learners only see times I can attend.
- As a learner, I want to book a 30- or 60-minute slot in my own time zone so that I am not confused by time differences.
- As a mentor, I want to be certain that two learners can never book the same slot.

FR-4 Sessions
- As a participant, I want to join the video session from the booking page so that no external tool is needed.

FR-5 Notifications
- As a participant, I want an e-mail confirmation and a reminder so that I do not forget the session.

## 6. Acceptance criteria (examples)

Booking (FR-3), written as Given / When / Then:
- Given a mentor with a free slot on Tuesday 18:00-19:00 Europe/Paris, when a learner in Europe/London views it, then it is shown as 17:00-18:00.
- Given a slot already booked, when a second learner tries to book it, then the booking is refused with a clear message and no duplicate exists in the database.
- Given a learner who is not signed in, when they click "Book", then they are asked to sign in and returned to the same slot afterwards.
- Given a booking, when either participant cancels more than 24 h before, then both receive a cancellation e-mail and the slot becomes free again.

## 7. Non-functional requirements

- Security: every table protected by Row Level Security; users can read only their own private data; mentors' e-mail addresses are never public.
- Privacy (GDPR): account deletion removes personal data within 30 days; analytics without third-party tracking cookies.
- Performance: public pages load in under 2.5 s (LCP) on a mid-range phone over 4G.
- Accessibility: WCAG 2.2 AA for all core flows (keyboard navigation, contrast, labels).
- Availability: hosted on managed services; no self-managed servers.
- Internationalization: English UI for the pilot; dates and times always shown in the viewer's time zone.

## 8. Constraints and assumptions

- Budget: free tiers during the pilot; less than EUR 100/month at 1,000 active users.
- Team: one developer working with an AI coding agent, one designer two days a month.
- Stack decided in docs/DECISIONS.md.

## 9. Roadmap

| Milestone | Content |
|---|---|
| M1 Foundation | Skeleton, design system, CI, deployment |
| M2 Accounts | Sign-up, sign-in, Google, roles, protected pages |
| M3 Profiles and directory | Profiles, avatars, public directory, settings |
| M4 Booking | Availability, booking without double booking, e-mails |
| M5 Sessions | LiveKit video rooms, reminders |
| M6 Launch | Security review, monitoring, custom domain |
