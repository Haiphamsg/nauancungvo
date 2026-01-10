SELECT schemaname,
       tablename,
       policyname,
       command,
       roles,
       using,
       check
FROM   pg_policies
WHERE  schemaname = 'public';
