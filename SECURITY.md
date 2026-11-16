# Politique de sécurité

## Versions prises en charge

La branche `master` et la dernière version publiée (`v0.3.x` à ce jour) reçoivent les
correctifs de sécurité. Les versions antérieures ne sont pas maintenues.

## Signaler une vulnérabilité

Ne pas ouvrir d'issue publique et ne pas publier de démonstration d'exploitation avant
qu'un correctif ait été discuté.

Utiliser le rapport privé GitHub :

1. ouvrir l'onglet **Security** du dépôt ;
2. cliquer sur **Report a vulnerability** ;
3. décrire le composant concerné, les conditions de reproduction, l'impact estimé et une
   proposition de correction éventuelle.

Ne jamais joindre de secret, de token, de mot de passe, de données patient ou de données
d'un établissement réel. Les échanges restent privés jusqu'à la publication coordonnée d'un
correctif.

## Traitement

Les signalements sont examinés au mieux des disponibilités du mainteneur. Un accusé de
réception est visé sous trois jours ouvrés ; l'évaluation et le calendrier de correction
dépendent de la gravité et de la complexité du défaut. Aucun programme de prime n'est
associé à ce dépôt.

## Périmètre

Sont notamment concernés : l'authentification locale et LDAP, les sessions et le CSRF, le
RBAC, le cloisonnement démo/réel, les imports Mercator/CSV/JSON, les exports, la
journalisation, la gestion des secrets et la configuration de déploiement.

Les audits réels doivent être hébergés sur une infrastructure maîtrisée, en HTTPS, avec des
secrets propres au déploiement, `ENVIRONMENT=production`, `COOKIE_SECURE=true` et un
rate-limiting en amont. La démonstration publique ne doit contenir aucune donnée réelle.
