import sqlite3
import json

conn = sqlite3.connect('data/user_auth.db')
cur = conn.cursor()

# Check MC358
row = cur.execute('''
    SELECT code, name, final_status, color_hex, is_completed, prereq_status, is_offered
    FROM user_curriculum_snapshot 
    WHERE user_id='1000' AND code='MC358'
''').fetchone()

if row:
    print('MC358 (deveria ser verde):')
    print(f'  final_status: {row[2]}')
    print(f'  color_hex: {row[3]}')
    print(f'  is_completed: {row[4]}')
    print(f'  prereq_status: {row[5]}')
    print(f'  is_offered: {row[6]}')
else:
    print('MC358 não encontrado!')

print('\n' + '='*50 + '\n')

# Get count by status
print('Distribuição de status:')
for row in cur.execute('''
    SELECT final_status, COUNT(*), color_hex
    FROM user_curriculum_snapshot 
    WHERE user_id='1000'
    GROUP BY final_status, color_hex
    ORDER BY COUNT(*) DESC
''').fetchall():
    print(f'  {row[0]}: {row[1]} cursos | cor: {row[2]}')

print('\n' + '='*50 + '\n')

# Sample courses by status
print('Exemplos por status:')
for status in ['completed', 'eligible_and_offered', 'eligible_not_offered', 'not_eligible']:
    rows = cur.execute(f'''
        SELECT code, name, color_hex
        FROM user_curriculum_snapshot 
        WHERE user_id='1000' AND final_status='{status}'
        LIMIT 3
    ''').fetchall()
    print(f'\n{status}:')
    for r in rows:
        print(f'  {r[0]}: {r[1]} | {r[2]}')

conn.close()
