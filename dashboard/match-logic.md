Good! Now I want to work on the matching logic, since I changed the data schema and moved from Google Sheet to Airtable

The calculation flow:
1/ Read database from Airtable
2/ Filter member list (for the column 'membership', only filter out those that are "Activated")
3/ Calculation

compatibility-score (full mark = 120) = (a-ideal-type + b-ideal-type)/2 
a-ideal-type (full mark = 120) = [(appearance-score * weighting + background-score * weighting + personality-score * weighting + values-score * weighting)/4] + other-requirement
b-ideal-type (full mark = 120) = [(appearance-score * weighting + background-score * weighting + personality-score * weighting + values-score * weighting)/4] + other-requirement
weighting = user would rank appearance, background, personality, values in order. first order = 1.5 weighting, second order = 1.2 weighting, third order = 0.8 weighting, forth order = 0.5 weighting
appearance-score (full mark = 100) = if age matched requirement, 20 score, else 0 score; if height matched requirement, 20 score, else 0 score; if face-rating is A, 60 score, if B, 30 score, if C, 0 score, if D, -30 score, if E, -60 score.
background-score (full mark = 100) = if occupation matches requirement, 50 score, else 0 score, if uni matches requirement, 50 score, else 0 score.
personality-score (full mark = 100) = if hobby have 0 duplicate, 0 score, else if 1 duplicate, 15 score, else if 2 duplicate, 30 score, else 45 score; if MBTI matches requirement, 30 score, else 0 score; if love language matches requirement, 25 score, else 0 score. 
values-score (full mark = 100) = if kids expectation matched requirement, 40 score, else 0 score; if smoking habit matched requirement, 30 score, else 0 score, if drinking habit matched requirement, 30 score, else 0 score; if religion matched requirement, 10 score, else 0 score.
other-requirement (full mark = 20) = compare my-chips and their-chips. if fulfilled 100% of my-chips, 20 score, if fulfilled 0% of my-chips, 0 score. If in between, calculate the % to output the score.

If user did not define requirement, eg their-kids-expectation is blank, then it means it accept all value, get full marks. 

4/ Output value to fill a table called 'full calculation'. Table column:
email-a, email-b, a-sex, b-sex, compatibility-score, a-score, a-deal-breaker-fail, a-weighting, a-appearance-score, a-background-score, a-personality-score, a-values-score, a-other-requirement-score, a-age-score, a-height-score... etc, same for b
a default is male, b default is female

a-weighting display the sequence, eg: appearance, background, personality, value
a-deal-breaker-fail list out items where a marked as deal breaker, but b fail to fulfill

5/ In the 'full calculation' table, have a new column called "Matched before?", and check the match history, if matched before, write "yes", else leave it blank

6/ Have a new table called "Match result". Rule: 1 male can only match with 1 female. and must be blank value for these 3 fields: 'a-deal-breaker-fail', 'b-deal-breaker-fail', 'matched before?'. Match would give from the highest compatibility to lowest, eg highest score is Peter and Mary with 85 score, these 2 are matched, and Peter and Mary cannot match with any other person in this round

7/ Write to table "Match history", so these people won't be match again in the future

8/ Based on the "Match result" to (1) send email to those who matched, state have new match, state score, and have link to dashboard. (2) in dashboard, will show photo, bio, why matched etc

==

Notes:
other-chips is not working now
only work for same sex pair
compatibility score is indenpend to deal-breaker

Future:
- why matched filed by AI generation
- new column force-match / block-match
- force-match, block-match





