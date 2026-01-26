FROM alpine:latest

RUN apk add --no-cache openssh

# Generate host keys
RUN ssh-keygen -A

# Add user
# Add user
RUN echo 'root:root' | chpasswd
RUN adduser -D testuser && echo 'testuser:password' | chpasswd

# Add key user
RUN adduser -D keyuser && echo 'keyuser:keypass' | chpasswd
RUN mkdir -p /home/keyuser/.ssh && chmod 700 /home/keyuser/.ssh
# We will mount or copy keys. For simplicity, let's copy context.
# We need to make sure build context includes e2e/keys/id_rsa.pub.
# But Dockerfile is in e2e/ssh_server/. 
# We should probably pass the key as build arg or copy it if we run build from e2e root.
# Let's assume we run docker build from `e2e/` or adjust compose context?
# Actually docker-compose.yml usually sets context.
# Let's check docker-compose.yml first.
# Writing COPY assuming context is set correctly or we will fix compose.
COPY keys/id_rsa.pub /home/keyuser/.ssh/authorized_keys
RUN chmod 600 /home/keyuser/.ssh/authorized_keys
RUN chown -R keyuser:keyuser /home/keyuser/.ssh

# Access config
RUN echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
RUN echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
RUN echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
RUN echo "ChallengeResponseAuthentication yes" >> /etc/ssh/sshd_config

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
